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
    let connectBtn, walletAddress, appSection, metamaskStatus;
    
    // Constants - Important: Fixed Chain ID for Somnia
    const SOMNIA_CHAIN_ID = 50312;
    const SOMNIA_CHAIN_ID_HEX = '0xC468'; // Hex of 50312
    
    // Contract address - Make sure this is up to date
    const CONTRACT_ADDRESS = "0xa2330a03f1e3e6de8b611370bca14efe11004469";
    
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
        console.log("Inicializando WalletManager...");
        
        // Obtener referencias a los elementos DOM
        connectBtn = document.getElementById('connect-wallet');
        walletAddress = document.getElementById('wallet-address');
        appSection = document.getElementById('app');
        metamaskStatus = document.getElementById('metamask-status');
        
        // Verificar que los elementos existen
        if (!connectBtn) {
            console.error("Error: Elemento 'connect-wallet' no encontrado");
            return;
        }
        
        console.log("Elementos DOM encontrados, configurando eventos...");
        
        // Usar onclick directo en lugar de addEventListener
        connectBtn.onclick = function() {
            console.log("Botón connect wallet clickeado");
            if (isConnected) {
                disconnectWallet();
            } else {
                connectWallet(false);
            }
        };
        
        // Mostrar estado mientras verificamos MetaMask
        metamaskStatus.textContent = "Verificando conexión con MetaMask...";
        metamaskStatus.style.display = "block";
        
        // Verificar disponibilidad de MetaMask
        if (typeof window.ethereum === 'undefined') {
            console.error("MetaMask no está instalado");
            metamaskStatus.textContent = "MetaMask no está instalado. Por favor instala MetaMask desde metamask.io";
            metamaskStatus.className = "status-message status-error";
            return;
        }
        
        metamaskStatus.style.display = "none";
        
        // Try to reconnect previous session
        checkPreviousSession();
        
        // Setup network change listeners
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', function (accounts) {
                console.log("Cuentas de MetaMask cambiaron:", accounts);
                window.location.reload();
            });
            
            window.ethereum.on('chainChanged', function (chainId) {
                console.log("Cadena de MetaMask cambió:", chainId);
                window.location.reload();
            });
        }
    }
    
    // Check for a previous session
    async function checkPreviousSession() {
        console.log("Verificando sesión previa...");
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                console.log("Cuentas actuales:", accounts);
                if (accounts && accounts.length > 0) {
                    // If there are connected accounts, reconnect automatically
                    console.log("Sesión existente encontrada, reconectando...");
                    connectWallet(true);
                } else {
                    console.log("No hay sesión previa");
                }
            } catch (error) {
                console.error("Error checking previous session:", error);
            }
        }
    }
    
    // Connect wallet function
    async function connectWallet(isAutoConnect = false) {
        console.log("Conectando wallet...", isAutoConnect ? "(reconexión automática)" : "(conexión manual)");
        try {
            // Check if MetaMask is installed
            if (typeof window.ethereum === 'undefined') {
                const errorMsg = "MetaMask no detectado. Por favor instala MetaMask desde metamask.io";
                console.error(errorMsg);
                alert(errorMsg);
                return;
            }
            
            console.log("Solicitando cuentas a MetaMask...");
            
            // Request accounts or use existing ones
            let accounts;
            try {
                accounts = isAutoConnect 
                    ? await window.ethereum.request({ method: 'eth_accounts' })
                    : await window.ethereum.request({ method: 'eth_requestAccounts' });
                console.log("Cuentas obtenidas:", accounts);
            } catch (err) {
                console.error("Error al solicitar cuentas:", err);
                alert(`Error al solicitar acceso a MetaMask: ${err.message}`);
                return;
            }
            
            if (!accounts || accounts.length === 0) {
                console.log("No se seleccionaron cuentas");
                return;
            }
            
            userAccount = accounts[0];
            console.log("Cuenta seleccionada:", userAccount);
            
            // Set up ethers
            console.log("Configurando proveedor y firmante...");
            provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();
            
            // Check current network
            console.log("Verificando red actual...");
            const network = await provider.getNetwork();
            console.log("Red actual:", network.name, "Chain ID:", network.chainId);
            
            if (network.chainId !== SOMNIA_CHAIN_ID) {
                console.log("Red incorrecta, intentando cambiar a Somnia...");
                // Try to switch to Somnia network
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: SOMNIA_CHAIN_ID_HEX }],
                    });
                    console.log("Solicitud de cambio de red enviada, reconectando en 1.5 segundos...");
                    // Reconnect after network change
                    setTimeout(() => connectWallet(true), 1500);
                    return;
                } catch (switchError) {
                    console.error("Error al cambiar de red:", switchError);
                    // If network doesn't exist, try to add it
                    if (switchError.code === 4902) {
                        console.log("Red no encontrada, intentando añadirla...");
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
                            console.log("Red añadida, reconectando en 1.5 segundos...");
                            setTimeout(() => connectWallet(true), 1500);
                            return;
                        } catch (addError) {
                            const errorMsg = "No se pudo añadir la red Somnia. Por favor configúrala manualmente en MetaMask.";
                            console.error(errorMsg, addError);
                            alert(errorMsg);
                            return;
                        }
                    } else {
                        const errorMsg = "No se pudo cambiar a la red Somnia. Por favor cámbiala manualmente.";
                        console.error(errorMsg);
                        alert(errorMsg);
                        return;
                    }
                }
            }
            
            // Create contract instance
            console.log("Creando instancia del contrato...");
            try {
                contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
                console.log("Contrato instanciado correctamente");
            } catch (contractError) {
                console.error("Error al instanciar el contrato:", contractError);
                alert(`Error al conectar con el contrato: ${contractError.message}`);
                return;
            }
            
            // Update UI
            console.log("Actualizando interfaz...");
            isConnected = true;
            connectBtn.textContent = 'Disconnect';
            walletAddress.textContent = `${userAccount.substring(0, 6)}...${userAccount.substring(38)}`;
            walletAddress.style.display = 'block';
            appSection.style.display = 'block';
            appSection.className = 'fade-in';
            
            // Notify app is ready
            console.log("Disparando evento walletConnected...");
            document.dispatchEvent(new CustomEvent('walletConnected', { 
                detail: { userAccount, contract, provider, signer }
            }));
            
            console.log("Wallet conectada exitosamente!");
            
        } catch (error) {
            console.error("Error general al conectar wallet:", error);
            alert(`Error al conectar: ${error.message}`);
        }
    }
    
    // Disconnect wallet function
    function disconnectWallet() {
        console.log("Desconectando wallet...");
        isConnected = false;
        userAccount = "";
        connectBtn.textContent = 'Connect Wallet';
        walletAddress.style.display = 'none';
        appSection.style.display = 'none';
        
        // Notify disconnection
        document.dispatchEvent(new CustomEvent('walletDisconnected'));
        
        console.log("Wallet desconectada (UI)");
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

// Exponer una función global para conectar wallet directamente desde HTML
window.connectMetaMask = function() {
    console.log("Función global connectMetaMask llamada");
    if (typeof ethereum !== 'undefined') {
        ethereum.request({ method: 'eth_requestAccounts' })
        .then(accounts => {
            console.log("Cuentas obtenidas (global):", accounts);
            alert("Conectado a: " + accounts[0]);
            // Recargar la página para que WalletManager reconozca la conexión
            window.location.reload();
        })
        .catch(err => {
            console.error("Error al conectar (global):", err);
            alert("Error al conectar: " + err.message);
        });
    } else {
        console.error("MetaMask no detectado (global)");
        alert("MetaMask no está instalado. Por favor instala MetaMask desde metamask.io");
    }
};

// Exposing to window for debugging
window.WalletManager = WalletManager;

// Inicializar automáticamente cuando el documento esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log("Documento cargado, inicializando WalletManager...");
    WalletManager.init();
});