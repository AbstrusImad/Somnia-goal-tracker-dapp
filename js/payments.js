// ABI y dirección del contrato DiscordSomniaLinks.sol serían necesarios aquí.
// const discordSomniaLinksABI = [/* ... ABI ... */];
// const discordSomniaLinksAddress = "0x..."; // Dirección del contrato desplegado

// Asumimos que provider y signer se obtienen de wallet.js y se pasan o se hacen accesibles globalmente.
// let provider;
// let signer;
// let ethers; // Para ethers.utils.parseEther, etc.

function initPayments() {
    console.log("Initializing Payments...");
    const searchDiscordUserButton = document.getElementById('search-discord-user-button');
    if (searchDiscordUserButton) {
        searchDiscordUserButton.addEventListener('click', handleSearchDiscordUser);
    }

    const sendFundsButton = document.getElementById('send-funds-button');
    if (sendFundsButton) {
        sendFundsButton.addEventListener('click', handleSendFunds);
    }
}

async function handleSearchDiscordUser() {
    const discordUserIdInput = document.getElementById('discord-user-id-input');
    const userSearchResultDiv = document.getElementById('user-search-result');
    if (!discordUserIdInput || !userSearchResultDiv) return;

    const discordUserId = discordUserIdInput.value;
    if (!discordUserId) {
        userSearchResultDiv.textContent = "Por favor, ingrese un ID de usuario de Discord.";
        userSearchResultDiv.style.color = "red";
        return;
    }

    console.log(`Searching for Discord User ID: ${discordUserId}`);
    userSearchResultDiv.textContent = `Buscando usuario ${discordUserId}...`;
    userSearchResultDiv.style.color = "black";

    // Simulación de consulta al backend/contrato (DiscordSomniaLinks.getSomniaAddress)
    // En una implementación real:
    // try {
    //     const contract = new ethers.Contract(discordSomniaLinksAddress, discordSomniaLinksABI, provider);
    //     const somniaAddress = await contract.getSomniaAddress(discordUserId);
    //     if (somniaAddress && somniaAddress !== "0x0000000000000000000000000000000000000000") {
    //         userSearchResultDiv.textContent = `Usuario encontrado. Dirección Somnia: ${somniaAddress}`;
    //         userSearchResultDiv.dataset.somniaAddress = somniaAddress; // Guardar para enviar fondos
    //         userSearchResultDiv.style.color = "green";
    //     } else {
    //         userSearchResultDiv.textContent = `Usuario de Discord no encontrado o no vinculado.`;
    //         userSearchResultDiv.style.color = "red";
    //         delete userSearchResultDiv.dataset.somniaAddress;
    //     }
    // } catch (error) {
    //     console.error("Error searching Discord user:", error);
    //     userSearchResultDiv.textContent = "Error al buscar usuario.";
    //     userSearchResultDiv.style.color = "red";
    //     delete userSearchResultDiv.dataset.somniaAddress;
    // }

    // Simulación actual:
    setTimeout(() => {
        if (discordUserId === "testuser123") { // Simular un usuario encontrado
            const mockAddress = "0x1234567890123456789012345678901234567890";
            userSearchResultDiv.textContent = `Usuario encontrado. Dirección Somnia: ${mockAddress}`;
            userSearchResultDiv.dataset.somniaAddress = mockAddress;
            userSearchResultDiv.style.color = "green";
        } else {
            userSearchResultDiv.textContent = `Usuario de Discord "${discordUserId}" no encontrado o no vinculado.`;
            userSearchResultDiv.style.color = "red";
            delete userSearchResultDiv.dataset.somniaAddress;
        }
    }, 1500);
}

async function handleSendFunds() {
    const userSearchResultDiv = document.getElementById('user-search-result');
    const amountToSendInput = document.getElementById('amount-to-send-input');
    if (!userSearchResultDiv || !amountToSendInput) return;

    const recipientAddress = userSearchResultDiv.dataset.somniaAddress;
    const amountString = amountToSendInput.value;

    if (!recipientAddress) {
        alert("Primero busque y encuentre un usuario de Discord vinculado.");
        return;
    }
    if (!amountString || isNaN(parseFloat(amountString)) || parseFloat(amountString) <= 0) {
        alert("Por favor, ingrese un monto válido para enviar.");
        return;
    }

    const amountInEth = parseFloat(amountString);
    console.log(`Attempting to send ${amountInEth} ETH to ${recipientAddress}`);

    // Simulación de transacción. En una implementación real:
    // if (!signer) {
    //     alert("Wallet no conectada o no disponible.");
    //     return;
    // }
    // try {
    //     const tx = {
    //         to: recipientAddress,
    //         value: ethers.utils.parseEther(amountString) // ethers.js v5
    //         // value: ethers.parseEther(amountString) // ethers.js v6
    //     };
    //     console.log("Transaction object prepared:", tx);
    //     alert(`Simulación: Enviando ${amountInEth} ETH a ${recipientAddress}. Revisa la consola para ver el objeto de transacción.`);
    //     // const transactionResponse = await signer.sendTransaction(tx);
    //     // console.log("Transaction sent:", transactionResponse.hash);
    //     // alert(`Transacción enviada! Hash: ${transactionResponse.hash}`);
    //     // Aquí se podría esperar a la confirmación: await transactionResponse.wait();
    //     // console.log("Transaction confirmed.");
    //     // alert("Transacción confirmada!");
    // } catch (error) {
    //     console.error("Error sending funds:", error);
    //     alert(`Error al enviar fondos: ${error.message || error}`);
    // }

    // Simulación actual:
    alert(`Simulación: Se enviarían ${amountInEth} ETH a ${recipientAddress}.`);
    console.log("Simulación: Parámetros de sendTransaction:", {
        to: recipientAddress,
        value: `ethers.utils.parseEther(${amountString})` // o ethers.parseEther para v6
    });
}

// Para que app.js pueda llamar a initPayments
// window.initPayments = initPayments; // O usar módulos ES6
// Si se usan módulos ES6, se exportaría: export { initPayments };
