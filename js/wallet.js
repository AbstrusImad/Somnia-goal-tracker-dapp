/**
 * wallet.js
 * Maneja la conexión y gestión de la wallet (MetaMask)
 */

const WalletManager = (() => {
    // Variables privadas
    let provider, signer, contract;
    let userAccount = "";
    let isConnected = false;
    
    // DOM elements
    const connectBtn = document.getElementById('connect-wallet');
    const walletAddress = document.getElementById('wallet-address');
    const appSection = document.getElementById('app');
    const metamaskStatus = document.getElementById('metamask-status');
    
    // Constants - Important: Fixed Chain ID for Somnia
    const SOMNIA_CHAIN_ID = 50312;
    const SOMNIA_CHAIN_ID_HEX = '0xC468'; // Hex of 50312
    
    // Contract address - Make sure this is up to date
    const CONTRACT_ADDRESS = "0xa834416362bff38f52dA74d601BD12D3e8C336f8";
    
    // Contract ABI - Updated with all functions from the expanded contract
    const CONTRACT_ABI = [
        // Basic goal functions
        "function addGoal(string calldata _text, uint256 _deadline) external",
        "function completeGoal(address _owner, uint256 _index) external",
        "function deleteGoal(address _owner, uint256 _index) external",
        "function editGoal(address _owner, uint256 _index, string calldata _newText, uint256 _newDeadline) external",
        
        // Sharing and access control
        "function grantAccess(uint256 _goalIndex, address _user, uint8 _role, string calldata _userName) external",
        "function revokeAccess(uint256 _goalIndex, address _user) external",
        "function getUserRole(address _owner, uint256 _goalIndex, address _user) external view returns (uint8)",
        
        // Viewing functions
        "function getUserGoals(address _owner) external view returns (tuple(string text, uint256 deadline, bool completed, uint256 createdAt, bool deleted, address creator, tuple(address userAddress, string userName, uint8 role)[] users)[] memory, uint256[] memory)",
        "function getGoalUsers(uint256 _goalIndex) external view returns (tuple(address userAddress, string userName, uint8 role)[] memory)",
        "function getSharedWithMeGoals() external view returns (address[] memory owners, uint256[] memory goalIndices)",
        "function getCompletedGoalsCount(address _owner) external view returns (uint256)",
        
        // Events
        "event GoalCreated(address indexed user, string text, uint256 deadline)",
        "event GoalCompleted(address indexed user, uint256 goalIndex)",
        "event GoalDeleted(address indexed user, uint256 goalIndex)",
        "event UserAccessGranted(address indexed goalOwner, uint256 goalIndex, address indexed user, uint8 role, string userName)",
        "event UserAccessRevoked(address indexed goalOwner, uint256 goalIndex, address indexed user)"
    ];

    // Setup event listeners
    function init() {
        connectBtn.addEventListener('click', function() {
            if (isConnected) {
                disconnectWallet();
            } else {
                connectWallet(false);
            }
        });
        
        // Try to reconnect previous session
        checkPreviousSession();
        
        // Setup network change listeners
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', function (accounts) {
                window.location.reload();
            });
            
            window.ethereum.on('chainChanged', function (chainId) {
                window.location.reload();
            });
        }
    }
    
    // Check for a previous session
    async function checkPreviousSession() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts && accounts.length > 0) {
                    // If there are connected accounts, reconnect automatically
                    connectWallet(true);
                }
            } catch (error) {
                console.error("Error checking previous session:", error);
            }
        }
    }
    
    // Connect wallet function
    async function connectWallet(isAutoConnect = false) {
        try {
            // Check if MetaMask is installed
            if (typeof window.ethereum === 'undefined') {
                alert("MetaMask not detected. Please install MetaMask from metamask.io");
                return;
            }
            
            // Request accounts or use existing ones
            const accounts = isAutoConnect 
                ? await window.ethereum.request({ method: 'eth_accounts' })
                : await window.ethereum.request({ method: 'eth_requestAccounts' });
                
            if (!accounts || accounts.length === 0) {
                return;
            }
            
            userAccount = accounts[0];
            
            // Set up ethers
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();
            
            // Check current network
            const network = await provider.getNetwork();
            console.log("Current network:", network.name, "Chain ID:", network.chainId);
            
            if (network.chainId !== SOMNIA_CHAIN_ID) {
                // Try to switch to Somnia network
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: SOMNIA_CHAIN_ID_HEX }],
                    });
                    // Reconnect after network change
                    setTimeout(() => connectWallet(true), 1500);
                    return;
                } catch (switchError) {
                    console.error("Error switching network:", switchError);
                    // If network doesn't exist, try to add it
                    if (switchError.code === 4902) {
                        try {
                            await window.ethereum.request({
                                method: 'wallet_addEthereumChain',
                                params: [{
                                    chainId: SOMNIA_CHAIN_ID_HEX,
                                    chainName: 'Somnia Testnet',
                                    nativeCurrency: {
                                        name: 'STT',
                                        symbol: 'STT',
                                        decimals: 18
                                    },
                                    rpcUrls: ['https://dream-rpc.somnia.network'],
                                    blockExplorerUrls: ['https://shannon-explorer.somnia.network']
                                }]
                            });
                            setTimeout(() => connectWallet(true), 1500);
                            return;
                        } catch (addError) {
                            alert("Could not add Somnia network. Please configure it manually in MetaMask.");
                            console.error("Error adding network:", addError);
                            return;
                        }
                    } else {
                        alert("Could not switch to Somnia network. Please change it manually.");
                        return;
                    }
                }
            }
            
            // Create contract instance
            contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
            
            // Update UI
            isConnected = true;
            connectBtn.textContent = 'Disconnect';
            walletAddress.textContent = `${userAccount.substring(0, 6)}...${userAccount.substring(38)}`;
            walletAddress.style.display = 'block';
            appSection.style.display = 'block';
            appSection.className = 'fade-in';
            
            // Notify app is ready
            document.dispatchEvent(new CustomEvent('walletConnected', { 
                detail: { userAccount, contract, provider, signer }
            }));
            
        } catch (error) {
            console.error("Error connecting wallet:", error);
            alert(`Error connecting: ${error.message}`);
        }
    }
    
    // Disconnect wallet function
    function disconnectWallet() {
        isConnected = false;
        userAccount = "";
        connectBtn.textContent = 'Connect Wallet';
        walletAddress.style.display = 'none';
        appSection.style.display = 'none';
        
        // Notify disconnection
        document.dispatchEvent(new CustomEvent('walletDisconnected'));
        
        // Note: MetaMask doesn't actually provide a way to programmatically disconnect
        // We're just updating the UI state, but the user remains connected in MetaMask
    }
    
    // Public API
    return {
        init,
        connectWallet,
        disconnectWallet,
        getContractInstance: () => contract,
        getUserAccount: () => userAccount,
        isWalletConnected: () => isConnected
    };
})();

// Exposing to window for debugging
window.WalletManager = WalletManager;