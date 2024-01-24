// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";

import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Gauge} from "./Gauge.sol";
import {INFTStrategy} from "../interfaces/INFTStrategy.sol";
import "./lib/RescueFundsLib.sol";
import "./lib/SafeTransferLib.sol";
import "./lib/EnumerableSetUpgradeable.sol";

contract ParallelNFTVault is
    Initializable,
    Ownable2StepUpgradeable,
    ReentrancyGuardUpgradeable,
    Gauge
{
    using SafeTransferLib for ERC20;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
    address public strategy; // address of the strategy contract
    bool public emergencyShutdown; // if true, no funds can be invested in the strategy
    bool public isWithdrawable; // if true, user can withdraw asset from vault

    // nft asset => tokens in vault
    mapping(address => EnumerableSetUpgradeable.UintSet) holdings;

    // nft asset => tokenId => depositor
    mapping(address => mapping(uint256 => address)) depositor;

    // uint256 public constant MAX_BPS = 10_000;

    error ZeroAmount();
    error VaultShutdown();
    error NotWithdrawable();
    error NotDepositor(uint256 tokenId);
    error NFTNotAvailable(uint256 tokenId);

    event NFTWithdrawn(address assetAddr, address receiver, uint256 tokenId);

    event NFTDeposited(address assetAddr, address depositor, uint256 tokenId);

    event ShutdownStateUpdated(bool shutdownState);

    modifier notShutdown() {
        if (emergencyShutdown) revert VaultShutdown();
        _;
    }

    modifier onlyWithdrawable() {
        if (!isWithdrawable) revert NotWithdrawable();
        _;
    }

    function initialize(address _owner) public initializer {
        __Ownable_init(_owner);
        __ReentrancyGuard_init();
        // __ERC4626_init(IERC20(token_));
    }

    function setStrategy(address strategy_) external onlyOwner {
        strategy = strategy_;
    }

    function updateEmergencyShutdownState(
        bool shutdownState_,
        bool detachStrategy
    ) external onlyOwner {
        if (shutdownState_ && detachStrategy) {
            // If we're exiting emergency shutdown, we need to empty strategy
            // _withdrawAllFromStrategy();
            strategy = address(0);
        }
        emergencyShutdown = shutdownState_;
        emit ShutdownStateUpdated(shutdownState_);
    }

    function setWithdrawable(bool _isWithdrawable) external onlyOwner {
        isWithdrawable = _isWithdrawable;
    }

    function deposit(
        address assetAddr_,
        address receiver_,
        uint256[] memory tokenIds_
    ) public nonReentrant notShutdown {
        if (receiver_ == address(0)) revert ZeroAddress();
        _receiveNFTs(assetAddr_, tokenIds_);

        if (strategy != address(0)) {
            INFTStrategy(strategy).depositNFTs(assetAddr_, tokenIds_);
        }
    }

    function _receiveNFTs(
        address assetAddr_,
        uint256[] memory tokenIds_
    ) internal virtual returns (uint256) {
        uint256 length = tokenIds_.length;
        address receiver = strategy == address(0) ? address(this) : strategy;
        for (uint256 i; i < length; ++i) {
            uint256 tokenId = tokenIds_[i];
            // We may already own the NFT here so we check in order:
            // Does the vault own it?
            //   - If so, check if its in holdings list
            //      - If so, we reject. This means the NFT has already been claimed for.
            //      - If not, it means we have not yet accounted for this NFT, so we continue.
            //   -If not, we "pull" it from the msg.sender and add to holdings.
            _transferFromERC721(assetAddr_, tokenId, receiver);
            depositor[assetAddr_][tokenId] = msg.sender;
            holdings[assetAddr_].add(tokenId);
            emit NFTDeposited(assetAddr_, msg.sender, tokenId);
        }
        return length;
    }

    function _transferFromERC721(
        address assetAddr_,
        uint256 tokenId_,
        address to_
    ) internal virtual {
        address kitties = 0x06012c8cf97BEaD5deAe237070F9587f8E7A266d;
        // address punks = 0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB;
        bytes memory data;
        if (assetAddr_ == kitties) {
            // Cryptokitties.
            data = abi.encodeWithSignature(
                "transferFrom(address,address,uint256)",
                msg.sender,
                to_,
                tokenId_
            );
            // } else if (assetAddr_ == punks) {
            //     // CryptoPunks.
            //     // Fix here for frontrun attack. Added in v1.0.2.
            //     bytes memory punkIndexToAddress = abi.encodeWithSignature("punkIndexToAddress(uint256)", tokenId_);
            //     (bool checkSuccess, bytes memory result) = address(assetAddr_).staticcall(punkIndexToAddress);
            //     (address nftOwner) = abi.decode(result, (address));
            //     require(checkSuccess && nftOwner == msg.sender, "Not the NFT owner");
            //     data = abi.encodeWithSignature("buyPunk(uint256)", tokenId_);
        } else {
            // Default.
            // Allow other contracts to "push" into the vault, safely.
            // If we already have the token requested, make sure we don't have it in the list to prevent duplicate minting.
            if (IERC721(assetAddr_).ownerOf(tokenId_) == to_) {
                require(
                    !holdings[assetAddr_].contains(tokenId_),
                    "Trying to use an owned NFT"
                );
                return;
            } else {
                data = abi.encodeWithSignature(
                    "safeTransferFrom(address,address,uint256)",
                    msg.sender,
                    to_,
                    tokenId_
                );
            }
        }
        (bool success, bytes memory resultData) = address(assetAddr_).call(
            data
        );
        require(success, string(resultData));
    }

    function withdraw(
        address assetAddr_,
        address receiver_,
        uint256[] memory tokenIds_
    ) public nonReentrant notShutdown onlyWithdrawable {
        if (receiver_ == address(0)) revert ZeroAddress();

        uint256 length = tokenIds_.length;

        for (uint256 i; i < length; ++i) {
            uint256 tokenId = tokenIds_[i];
            if (depositor[assetAddr_][tokenId] != msg.sender)
                revert NotDepositor(tokenId);
            if (IERC721(assetAddr_).ownerOf(tokenId) == address(this)) {
                _transferERC721(assetAddr_, receiver_, tokenId);
            } else {
                _withdrawNFTFromStrategy(assetAddr_, tokenId);
                _transferERC721(assetAddr_, receiver_, tokenId);
            }

            holdings[assetAddr_].remove(tokenId);
            depositor[assetAddr_][tokenId] = address(0);
            emit NFTWithdrawn(assetAddr_, receiver_, tokenId);
        }
    }

    function withdrawNFTsFromStrategy(
        address assetAddr_,
        uint256[] memory tokenIds_
    ) external onlyOwner {
        _withdrawNFTsFromStrategy(assetAddr_, tokenIds_);
    }

    function _withdrawNFTsFromStrategy(
        address assetAddr_,
        uint256[] memory tokenIds_
    ) internal {
        INFTStrategy(strategy).withdrawNFTs(assetAddr_, tokenIds_);
    }

    function _withdrawNFTFromStrategy(
        address assetAddr_,
        uint256 tokenId_
    ) internal {
        INFTStrategy(strategy).withdrawNFT(assetAddr_, tokenId_);
    }

    function _transferERC721(
        address assetAddr_,
        address to_,
        uint256 tokenId_
    ) internal virtual {
        address kitties = 0x06012c8cf97BEaD5deAe237070F9587f8E7A266d;
        // address punks = 0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB;
        bytes memory data;
        if (assetAddr_ == kitties) {
            // Changed in v1.0.4.
            data = abi.encodeWithSignature(
                "transfer(address,uint256)",
                to_,
                tokenId_
            );
            // } else if (assetAddr_ == punks) {
            //     // CryptoPunks.
            //     data = abi.encodeWithSignature("transferPunk(address,uint256)", to_, tokenId_);
        } else {
            // Default.
            data = abi.encodeWithSignature(
                "safeTransferFrom(address,address,uint256)",
                address(this),
                to_,
                tokenId_
            );
        }
        (bool success, bytes memory returnData) = address(assetAddr_).call(
            data
        );
        require(success, string(returnData));
    }

    // function _transferFromERC721(address assetAddr_, uint256 tokenId_) internal virtual {
    //     address kitties = 0x06012c8cf97BEaD5deAe237070F9587f8E7A266d;
    //     address punks = 0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB;
    //     bytes memory data;
    //     if (assetAddr_ == kitties) {
    //         // Cryptokitties.
    //         data = abi.encodeWithSignature("transferFrom(address,address,uint256)", msg.sender, address(this), tokenId_);
    //     } else if (assetAddr_ == punks) {
    //         // CryptoPunks.
    //         // Fix here for frontrun attack. Added in v1.0.2.
    //         bytes memory punkIndexToAddress = abi.encodeWithSignature("punkIndexToAddress(uint256)", tokenId_);
    //         (bool checkSuccess, bytes memory result) = address(assetAddr_).staticcall(punkIndexToAddress);
    //         (address nftOwner) = abi.decode(result, (address));
    //         require(checkSuccess && nftOwner == msg.sender, "Not the NFT owner");
    //         data = abi.encodeWithSignature("buyPunk(uint256)", tokenId_);
    //     } else {
    //         // Default.
    //         // Allow other contracts to "push" into the vault, safely.
    //         // If we already have the token requested, make sure we don't have it in the list to prevent duplicate minting.
    //         if (IERC721Upgradeable(assetAddr_).ownerOf(tokenId_) == address(this)) {
    //             require(!holdings.contains(tokenId_), "Trying to use an owned NFT");
    //             return;
    //         } else {
    //             data = abi.encodeWithSignature("safeTransferFrom(address,address,uint256)", msg.sender, address(this), tokenId_);
    //         }
    //     }
    //     (bool success, bytes memory resultData) = address(assetAddr_).call(data);
    //     require(success, string(resultData));
    // }

    // Added in v1.0.3.
    function allHoldings(
        address assetAddr_
    ) external view virtual returns (uint256[] memory) {
        uint256 len = holdings[assetAddr_].length();
        uint256[] memory idArray = new uint256[](len);
        for (uint256 i; i < len; ++i) {
            idArray[i] = holdings[assetAddr_].at(i);
        }
        return idArray;
    }

    // Added in v1.0.3.
    function totalHoldings(
        address assetAddr_
    ) external view virtual returns (uint256) {
        return holdings[assetAddr_].length();
    }

    function nftIdAt(
        address assetAddr_,
        uint256 holdingsIndex
    ) external view virtual returns (uint256) {
        return holdings[assetAddr_].at(holdingsIndex);
    }

    /**
     * @notice Rescues funds from the contract if they are locked by mistake.
     * @param token_ The address of the token contract.
     * @param rescueTo_ The address where rescued tokens need to be sent.
     * @param amount_ The amount of tokens to be rescued.
     */
    function rescueFunds(
        address token_,
        address rescueTo_,
        uint256 amount_
    ) external onlyOwner {
        RescueFundsLib.rescueFunds(token_, rescueTo_, amount_);
    }
}
