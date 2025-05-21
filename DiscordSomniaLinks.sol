// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DiscordSomniaLinks {
    address public owner;

    mapping(uint256 => address) public discordIdToSomniaAddress;
    mapping(address => uint256) public somniaAddressToDiscordId;

    event LinkUpdated(address indexed somniaAddress, uint256 indexed discordId);
    event LinkDeleted(address indexed somniaAddress, uint256 indexed discordId);

    constructor() {
        owner = msg.sender;
    }

    function linkAddress(uint256 _discordId) public {
        address somniaAddress = msg.sender;

        // Check if the Discord ID is already linked to a different Somnia address
        require(discordIdToSomniaAddress[_discordId] == address(0) || discordIdToSomniaAddress[_discordId] == somniaAddress, "Discord ID already linked to another address");

        // If the Somnia address was already linked to an old Discord ID, remove the old link
        uint256 oldDiscordId = somniaAddressToDiscordId[somniaAddress];
        if (oldDiscordId != 0) {
            delete discordIdToSomniaAddress[oldDiscordId];
        }

        // Create the new link
        discordIdToSomniaAddress[_discordId] = somniaAddress;
        somniaAddressToDiscordId[somniaAddress] = _discordId;

        emit LinkUpdated(somniaAddress, _discordId);
    }

    function getSomniaAddress(uint256 _discordId) public view returns (address) {
        return discordIdToSomniaAddress[_discordId];
    }

    function getDiscordId(address _somniaAddress) public view returns (uint256) {
        return somniaAddressToDiscordId[_somniaAddress];
    }

    function unlinkAddress() public {
        address somniaAddress = msg.sender;
        uint256 discordId = somniaAddressToDiscordId[somniaAddress];

        require(discordId != 0, "No link found for this address");

        delete discordIdToSomniaAddress[discordId];
        delete somniaAddressToDiscordId[somniaAddress];

        emit LinkDeleted(somniaAddress, discordId);
    }

    function adminDeleteLink(uint256 _discordId) public {
        require(msg.sender == owner, "Only owner can call this function");
        address somniaAddress = discordIdToSomniaAddress[_discordId];
        require(somniaAddress != address(0), "No link found for this Discord ID");

        delete discordIdToSomniaAddress[_discordId];
        delete somniaAddressToDiscordId[somniaAddress];

        emit LinkDeleted(somniaAddress, _discordId);
    }

    function transferOwnership(address newOwner) public {
        require(msg.sender == owner, "Only owner can call this function");
        require(newOwner != address(0), "New owner cannot be the zero address");
        owner = newOwner;
    }
}
