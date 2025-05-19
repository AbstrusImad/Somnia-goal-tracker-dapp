
/**
 * app.js
 * Archivo principal que inicializa la aplicación Goal Tracker
 */

// Función de inicialización principal
function initApp() {
    console.log("Inicializando Goal Tracker App...");
    
    // Inicializar módulo de wallet
    WalletManager.init();
    
    // Escuchar evento de conexión de wallet
    document.addEventListener('walletConnected', function(event) {
        const { userAccount, contract } = event.detail;
        
        console.log("Wallet conectada:", userAccount);
        
        // Inicializar módulos una vez que la wallet está conectada
        GoalManager.init(contract, userAccount);
        SharingManager.init(contract, userAccount);
        
        // Mostrar la pestaña de Mis Objetivos por defecto
        SharingManager.showMyGoalsTab();
    });
    
    // Escuchar evento de desconexión de wallet
    document.addEventListener('walletDisconnected', function() {
        console.log("Wallet desconectada");
    });
    
    // Verificar si ethers.js está cargado correctamente
    if (typeof ethers === 'undefined') {
        console.error("Ethers no está definido. Intentando cargar de nuevo...");
        
        // Intentar cargar ethers.js dinámicamente como último recurso
        var script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js";
        script.onload = function() {
            console.log("Ethers cargado exitosamente:", ethers.version);
            WalletManager.init();
        };
        document.head.appendChild(script);
    }
}

// Iniciar la aplicación cuando se cargue la página
window.addEventListener('load', initApp);