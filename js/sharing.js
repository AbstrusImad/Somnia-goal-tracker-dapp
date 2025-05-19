/**
 * sharing.js
 * Maneja la funcionalidad relacionada con compartir objetivos y gestionar permisos
 */

const SharingManager = (() => {
    // Variables locales
    let contract;
    let userAccount;
    let goalToShare = -1;
    let goalToManage = -1;
    let autoRefreshSystem = null;
    
    // DOM elements
    let shareModal, shareAddress, shareName, shareRole, shareCancel, shareConfirm;
    let accessModal, usersList, accessDone, addUserBtn, sharedGoalsList, sharedGoalsCount;
    let tabMyGoals, tabSharedGoals, contentMyGoals, contentSharedGoals;
    
    // Inicialización
    function init(contractInstance, account) {
        console.log("Initializing SharingManager...");
        contract = contractInstance;
        userAccount = account;
        
        // Obtener referencias a los elementos DOM
        shareModal = document.getElementById('share-modal');
        shareAddress = document.getElementById('share-address');
        shareName = document.getElementById('share-name');
        shareRole = document.getElementById('share-role');
        shareCancel = document.getElementById('share-cancel');
        shareConfirm = document.getElementById('share-confirm');
        accessModal = document.getElementById('access-modal');
        usersList = document.getElementById('users-list');
        accessDone = document.getElementById('access-done');
        addUserBtn = document.getElementById('add-user-button');
        sharedGoalsList = document.getElementById('shared-goals-list');
        sharedGoalsCount = document.getElementById('shared-goals-count');
        
        // Tab elements
        tabMyGoals = document.getElementById('tab-my-goals');
        tabSharedGoals = document.getElementById('tab-shared-goals');
        contentMyGoals = document.getElementById('content-my-goals');
        contentSharedGoals = document.getElementById('content-shared-goals');
        
        console.log("Setting up events for sharing goals...");
        
        // Configurar eventos usando métodos directos
        if (shareCancel) shareCancel.onclick = hideShareModal;
        if (shareConfirm) shareConfirm.onclick = confirmShareGoal;
        if (accessDone) accessDone.onclick = hideAccessModal;
        if (addUserBtn) addUserBtn.onclick = () => showShareModal(goalToManage);
        
        // Tab navigation
        if (tabMyGoals) tabMyGoals.onclick = showMyGoalsTab;
        if (tabSharedGoals) tabSharedGoals.onclick = showSharedGoalsTab;
        
        // Iniciar sistema de actualizaciones automáticas
        if (autoRefreshSystem) {
            autoRefreshSystem.stop();
        }
        autoRefreshSystem = setupAutoRefresh();
        
        console.log("SharingManager initialized successfully");
    }
    
    // Mostrar la pestaña de mis objetivos
    function showMyGoalsTab() {
        console.log("Showing My Goals tab");
        
        // Activar pestaña
        if (tabMyGoals) tabMyGoals.classList.add('active');
        if (tabSharedGoals) tabSharedGoals.classList.remove('active');
        
        // Mostrar contenido
        if (contentMyGoals) contentMyGoals.classList.add('active');
        if (contentSharedGoals) contentSharedGoals.classList.remove('active');
        
        // Cargar objetivos
        if (window.GoalManager) {
            window.GoalManager.loadMyGoals();
        } else {
            console.error("GoalManager is not available");
        }
    }
    
    // Mostrar la pestaña de objetivos compartidos
    function showSharedGoalsTab() {
        console.log("Showing Shared Goals tab");
        
        // Activar pestaña
        if (tabSharedGoals) tabSharedGoals.classList.add('active');
        if (tabMyGoals) tabMyGoals.classList.remove('active');
        
        // Mostrar contenido
        if (contentSharedGoals) contentSharedGoals.classList.add('active');
        if (contentMyGoals) contentMyGoals.classList.remove('active');
        
        // Cargar objetivos compartidos
        loadSharedGoals();
    }
    
    // Mostrar modal para compartir
    function showShareModal(goalIndex) {
        console.log("Showing share modal for goal:", goalIndex);
        goalToShare = goalIndex;
        
        // Resetear campos
        if (shareAddress) shareAddress.value = '';
        if (shareName) shareName.value = '';
        if (shareRole) shareRole.value = '1'; // Default: Viewer
        
        // If called from access modal, hide access modal first
        if (accessModal && accessModal.classList.contains('active')) {
            accessModal.classList.remove('active');
        }
        
        // Mostrar modal
        if (shareModal) {
            // Ensure modal is placed at the top of the stacking context
            shareModal.style.zIndex = "2000"; // Higher than other modals
            shareModal.classList.add('active');
            console.log("Share modal activated");
        } else {
            console.error("Error: shareModal not found");
        }
    }
    
    // Ocultar modal para compartir
    function hideShareModal() {
        console.log("Hiding share modal");
        if (shareModal) {
            shareModal.classList.remove('active');
            
            // If called from access management, re-show access modal
            if (goalToManage >= 0) {
                setTimeout(() => {
                    if (accessModal) {
                        accessModal.classList.add('active');
                    }
                }, 100);
            }
        }
        goalToShare = -1;
    }
    
    // Confirmar compartir objetivo
    async function confirmShareGoal() {
        console.log("Confirming sharing goal:", goalToShare);
        if (goalToShare < 0) {
            console.error("No goal selected to share");
            return;
        }
        
        try {
            const address = shareAddress.value.trim();
            const name = shareName.value.trim();
            const role = parseInt(shareRole.value);
            
            console.log("Share data:", { address, name, role, goalIndex: goalToShare });
            
            if (!ethers.utils.isAddress(address)) {
                alert("Please enter a valid wallet address");
                return;
            }
            
            // Deshabilitar botón mientras se procesa
            if (shareConfirm) {
                shareConfirm.innerHTML = "<span class='loader'></span> Sharing...";
                shareConfirm.disabled = true;
            }
            
            // Verificar el contrato
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            
            // Información de depuración
            console.log("Calling grantAccess function with parameters:", {
                goalIndex: goalToShare,
                address,
                role,
                name
            });
            
            // Llamar al contrato
            try {
                const tx = await contract.grantAccess(goalToShare, address, role, name);
                console.log("Transaction sent:", tx.hash);
                await tx.wait();
                console.log("Transaction confirmed!");
                
                // Mostrar mensaje de éxito
                alert(`Goal successfully shared with ${address}`);
            } catch (contractError) {
                console.error("Error calling contract:", contractError);
                
                // Intentar con una versión alternativa si hay error
                if (contractError.message.includes("parameters") || 
                    contractError.message.includes("arguments")) {
                    console.log("Trying alternative version...");
                    
                    try {
                        // Algunas implementaciones podrían tener orden diferente
                        const tx = await contract.grantAccess(goalToShare, address, name, role);
                        console.log("Alternative transaction sent:", tx.hash);
                        await tx.wait();
                        console.log("Alternative transaction confirmed!");
                        
                        // Mostrar mensaje de éxito
                        alert(`Goal successfully shared with ${address}`);
                    } catch (altError) {
                        console.error("Error in alternative version:", altError);
                        throw altError;
                    }
                } else {
                    throw contractError;
                }
            }
            
            // Si estamos en el modal de gestión de acceso, actualizar la lista
            if (goalToManage >= 0) {
                loadGoalUsers(goalToManage);
            }
            
            hideShareModal();
            
        } catch (error) {
            console.error("Error sharing goal:", error);
            alert(`Error: ${error.message}`);
        } finally {
            if (shareConfirm) {
                shareConfirm.innerHTML = "Share Goal";
                shareConfirm.disabled = false;
            }
        }
    }
    
    // Mostrar modal de gestión de acceso
    function showAccessModal(goalIndex) {
        console.log("Showing access management modal for goal:", goalIndex);
        goalToManage = goalIndex;
        
        // Load users with access to this goal
        loadGoalUsers(goalIndex);
        
        // Show modal
        if (accessModal) {
            accessModal.style.zIndex = "1500"; // Lower than share modal
            accessModal.classList.add('active');
        } else {
            console.error("Error: accessModal not found");
        }
    }
    
    // Ocultar modal de gestión de acceso
    function hideAccessModal() {
        console.log("Hiding access management modal");
        if (accessModal) accessModal.classList.remove('active');
        goalToManage = -1;
    }
    
    // Cargar usuarios con acceso a un objetivo
    async function loadGoalUsers(goalIndex) {
        console.log("Loading users with access to goal:", goalIndex);
        try {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            
            if (!usersList) {
                console.error("Error: usersList not found");
                return;
            }
            
            const users = await contract.getGoalUsers(goalIndex);
            console.log("Users found:", users);
            
            // Clear list
            usersList.innerHTML = '';
            
            if (users.length === 0) {
                usersList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-text">This goal hasn't been shared with anyone yet.</div>
                    </div>
                `;
                return;
            }
            
            // Add each user to the list - ENGLISH
            users.forEach(user => {
                const userElement = document.createElement('div');
                userElement.className = 'user-item';
                
                let roleName;
                switch (parseInt(user.role)) {
                    case 1: roleName = 'Viewer'; break;
                    case 2: roleName = 'Editor'; break;
                    default: roleName = 'Unknown';
                }
                
                userElement.innerHTML = `
                    <div class="user-info">
                        <div class="user-address">${user.userAddress.substring(0, 6)}...${user.userAddress.substring(38)}</div>
                        <div class="user-name">${user.userName || 'No name'} - <span class="status-badge badge-role">${roleName}</span></div>
                    </div>
                    <div class="user-actions">
                        <button id="revoke-button-${user.userAddress.substring(2, 10)}" class="sf-button sf-button-danger">Revoke Access</button>
                    </div>
                `;
                
                usersList.appendChild(userElement);
                
                // Configure event for revoke button
                const revokeBtn = document.getElementById(`revoke-button-${user.userAddress.substring(2, 10)}`);
                if (revokeBtn) {
                    revokeBtn.onclick = () => revokeAccess(user.userAddress);
                }
            });
            
        } catch (error) {
            console.error("Error loading users:", error);
            if (usersList) {
                usersList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-text">Error loading users: ${error.message}</div>
                    </div>
                `;
            }
        }
    }
    
    // Revocar acceso a un usuario
    async function revokeAccess(userAddress) {
        console.log(`Revoking access for ${userAddress} to goal ${goalToManage}`);
        if (goalToManage < 0) {
            console.error("No goal selected to manage");
            return;
        }
        
        try {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            
            // Show confirmation message - ENGLISH
            if (!confirm(`Are you sure you want to revoke access for ${userAddress.substring(0, 6)}...${userAddress.substring(38)}?`)) {
                return;
            }
            
            // Call contract
            const tx = await contract.revokeAccess(goalToManage, userAddress);
            console.log("Transaction sent:", tx.hash);
            await tx.wait();
            console.log("Access successfully revoked");
            
            // Update user list
            loadGoalUsers(goalToManage);
            
            // Show success message
            alert("Access successfully revoked");
            
        } catch (error) {
            console.error("Error revoking access:", error);
            alert(`Error: ${error.message}`);
        }
    }
    
    // Cargar objetivos compartidos conmigo - VERSIÓN CORREGIDA
    async function loadSharedGoals() {
        console.log("Loading shared goals");
        try {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            
            if (!sharedGoalsList || !sharedGoalsCount) {
                console.error("Error: DOM elements for shared goals not found");
                return;
            }
            
            // Limpiar lista ANTES de empezar - ESTO ES CRUCIAL
            sharedGoalsList.innerHTML = '';
            
            const [owners, goalIndices] = await contract.getSharedWithMeGoals();
            console.log("Shared goals received:", { owners, goalIndices });
            
            // Usar un Map para rastrear objetivos únicos (por owner+index)
            const uniqueGoals = new Map();
            
            // Primera pasada: identificar objetivos únicos y verificar acceso
            for (let i = 0; i < owners.length; i++) {
                const owner = owners[i];
                const index = typeof goalIndices[i].toNumber === 'function' ? 
                              goalIndices[i].toNumber() : Number(goalIndices[i]);
                
                // Crear una clave única basada en propietario e índice
                const uniqueKey = `${owner.toLowerCase()}-${index}`;
                
                // Si ya procesamos este objetivo, saltar
                if (uniqueGoals.has(uniqueKey)) {
                    console.log(`Duplicate goal ignored: ${uniqueKey}`);
                    continue;
                }
                
                console.log(`Verifying access to shared goal ${i}: owner=${owner}, index=${index}, key=${uniqueKey}`);
                
                try {
                    // Verificar si todavía tenemos acceso verificando nuestro rol
                    const role = await contract.getUserRole(owner, index, userAccount);
                    const roleValue = typeof role === 'object' && role.toNumber ? role.toNumber() : Number(role);
                    
                    // Si el rol es mayor que 0, aún tenemos acceso
                    if (roleValue > 0) {
                        // Añadir al mapa de objetivos únicos
                        uniqueGoals.set(uniqueKey, { owner, index, roleValue });
                    } else {
                        console.log(`Access revoked for goal: owner=${owner}, index=${index}`);
                    }
                } catch (error) {
                    console.error(`Error verifying access to goal (${owner}, ${index}):`, error);
                    // Si hay error, asumimos que ya no tenemos acceso
                }
            }
            
            // Segunda pasada: verificar que los objetivos existen y no están eliminados
            const validGoals = [];
            
            for (const [uniqueKey, goalData] of uniqueGoals.entries()) {
                try {
                    const { owner, index } = goalData;
                    
                    // Intentar obtener el objetivo del contrato
                    const [goals, indices] = await contract.getUserGoals(owner);
                    
                    let goalFound = false;
                    
                    // Buscar el objetivo específico por índice
                    for (let j = 0; j < indices.length; j++) {
                        const goalIndex = typeof indices[j].toNumber === 'function' ? 
                                         indices[j].toNumber() : Number(indices[j]);
                        
                        if (goalIndex === index) {
                            // Verificar si el objetivo ha sido eliminado
                            if (goals[j].deleted === true) {
                                console.log(`Goal ${uniqueKey} is marked as deleted, ignoring`);
                            } else {
                                // Objetivo válido encontrado
                                goalFound = true;
                                validGoals.push({
                                    owner,
                                    index,
                                    uniqueKey,
                                    goal: goals[j]
                                });
                            }
                            break;
                        }
                    }
                    
                    if (!goalFound) {
                        console.log(`Goal with index ${index} not found for owner ${owner}`);
                    }
                    
                } catch (error) {
                    console.error(`Error verifying existence of goal ${uniqueKey}:`, error);
                }
            }
            
            // Actualizar contador solo con objetivos válidos y existentes
            const validGoalsCount = validGoals.length;
            console.log(`Found ${validGoalsCount} valid, existing and unique shared goals`);
            
            // Actualizar contador con el número real de objetivos con acceso
            sharedGoalsCount.textContent = validGoalsCount;
            
            if (validGoalsCount === 0) {
                sharedGoalsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🔄</div>
                        <div class="empty-state-text">You don't have any goals shared with you at the moment.</div>
                    </div>
                `;
                return;
            }
            
            // Renderizar los objetivos válidos
            for (const { owner, index, uniqueKey, goal } of validGoals) {
                renderSharedGoalItem(goal, owner, index, uniqueKey);
            }
            
        } catch (error) {
            console.error("Error loading shared goals:", error);
            if (sharedGoalsList) {
                sharedGoalsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-text">Error loading shared goals: ${error.message}</div>
                    </div>
                `;
            }
            
            // Mostrar botón para reparar si hay error
            sharedGoalsList.innerHTML += `
                <div class="status-message status-warning" style="margin-top: 20px;">
                    <button onclick="SharingManager.repairSharedGoalsView()" class="sf-button">
                        Repair View
                    </button>
                </div>
            `;
        }
    }
    
    // Renderizar un objetivo compartido - VERSIÓN CORREGIDA
    function renderSharedGoalItem(goal, owner, index, uniqueKey) {
        console.log(`Rendering shared goal: owner=${owner}, index=${index}, key=${uniqueKey}`);
        
        // Create a safe ID for DOM element (no special characters)
        const safeId = uniqueKey.replace(/[^a-zA-Z0-9]/g, '');
        
        // Check if element with this ID already exists
        if (document.getElementById(`goal-item-${safeId}`)) {
            console.log(`Goal ${uniqueKey} already rendered, skipping`);
            return;
        }
        
        const goalElement = document.createElement('div');
        goalElement.id = `goal-item-${safeId}`;
        
        // Convert values to primitive types if they are BigNumber
        const deadline = typeof goal.deadline === 'object' && goal.deadline.toNumber ? 
                         goal.deadline.toNumber() : Number(goal.deadline);
        const completed = goal.completed === true;
        
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const isExpired = !completed && currentTimestamp > deadline;
        
        if (completed) {
            goalElement.className = 'goal-item completed fade-in';
        } else if (isExpired) {
            goalElement.className = 'goal-item expired fade-in';
        } else {
            goalElement.className = 'goal-item pending fade-in';
        }
        
        let statusBadge = '';
        if (completed) {
            statusBadge = '<span class="status-badge badge-completed">Completed</span>';
        } else if (isExpired) {
            statusBadge = '<span class="status-badge badge-expired">Expired</span>';
        } else {
            statusBadge = '<span class="status-badge badge-pending">In Progress</span>';
        }
        
        let deadlineDate;
        try {
            deadlineDate = new Date(deadline * 1000).toLocaleDateString();
        } catch (error) {
            console.error("Error formatting date:", error);
            deadlineDate = "Invalid date";
        }
        
        // Escape text to avoid HTML issues
        const safeText = typeof goal.text === 'string' ? 
                         goal.text.replace(/</g, '&lt;').replace(/>/g, '&gt;') : 
                         'Goal without text';
        
        // Build HTML element - ENGLISH VERSION
        goalElement.innerHTML = `
            <div class="goal-owner">
                <span class="goal-owner-icon">👤</span>
                <span>Shared by: ${owner.substring(0, 6)}...${owner.substring(38)}</span>
            </div>
            <div class="goal-title">
                <span>${safeText}</span>
                ${statusBadge}
            </div>
            <div class="goal-deadline">Deadline: ${deadlineDate}</div>
            <div class="goal-role">
                <span class="status-badge badge-role">Loading role...</span>
            </div>
            <div class="goal-actions">
                <span class="loader"></span> Loading actions...
            </div>
        `;
        
        sharedGoalsList.appendChild(goalElement);
        
        // Check role and update actions
        checkRoleAndRender(goalElement, owner, index, completed, isExpired, goal);
    }
    
    // Verificar rol y actualizar acciones
    async function checkRoleAndRender(goalElement, owner, index, completed, isExpired, goal) {
        try {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            
            const role = await contract.getUserRole(owner, index, userAccount);
            console.log(`Role obtained for shared goal: ${role}`);
            
            const roleValue = typeof role === 'object' && role.toNumber ? role.toNumber() : Number(role);
            
            // Build actions based on role
            let actions = '';
            
            // For completed goals, only show Delete and Manage Access
            if (completed) {
                if (roleValue >= 3) { // Admin
                    actions += `
                        <button id="delete-shared-${owner.substring(2, 10)}-${index}" 
                            class="sf-button sf-button-danger">Delete</button>
                    `;
                }
                
                // Always show Manage Access button regardless of role
                actions += `
                    <button id="access-shared-${owner.substring(2, 10)}-${index}" 
                        class="sf-button">Manage Access</button>
                `;
            } else {
                // For non-completed goals, show appropriate buttons
                if (roleValue >= 2 && !isExpired) { // Editor or higher and not expired
                    actions += `
                        <button id="complete-shared-${owner.substring(2, 10)}-${index}" 
                            class="sf-button">Mark Complete</button>
                        
                        <button id="edit-shared-${owner.substring(2, 10)}-${index}" 
                            class="sf-button">Edit</button>
                    `;
                }
                
                if (roleValue >= 3) { // Admin
                    actions += `
                        <button id="delete-shared-${owner.substring(2, 10)}-${index}" 
                            class="sf-button sf-button-danger">Delete</button>
                    `;
                }
                
                // Always show Manage Access button
                actions += `
                    <button id="access-shared-${owner.substring(2, 10)}-${index}" 
                        class="sf-button">Manage Access</button>
                `;
            }
            
            // Add actions to the element
            const actionsContainer = goalElement.querySelector('.goal-actions');
            if (actionsContainer) {
                actionsContainer.innerHTML = actions;
                
                // Configure events for buttons
                if (roleValue >= 2 && !completed && !isExpired) {
                    const completeBtn = document.getElementById(`complete-shared-${owner.substring(2, 10)}-${index}`);
                    if (completeBtn) {
                        completeBtn.onclick = () => window.GoalManager.completeGoal(owner, index);
                    }
                    
                    const editBtn = document.getElementById(`edit-shared-${owner.substring(2, 10)}-${index}`);
                    if (editBtn) {
                        editBtn.onclick = () => window.GoalManager.showEditModal(
                            owner, 
                            index, 
                            goal.text, 
                            typeof goal.deadline === 'object' && goal.deadline.toNumber ? 
                            goal.deadline.toNumber() : Number(goal.deadline)
                        );
                    }
                }
                
                if (roleValue >= 3) {
                    const deleteBtn = document.getElementById(`delete-shared-${owner.substring(2, 10)}-${index}`);
                    if (deleteBtn) {
                        deleteBtn.onclick = () => window.GoalManager.showDeleteModal(owner, index);
                    }
                }
                
                // Add access management button event
                const accessBtn = document.getElementById(`access-shared-${owner.substring(2, 10)}-${index}`);
                if (accessBtn) {
                    accessBtn.onclick = () => showAccessModal(index);
                }
            }
            
            // Determine role name - ENGLISH
            let roleName;
            switch (roleValue) {
                case 1: roleName = 'Viewer'; break;
                case 2: roleName = 'Editor'; break;
                case 3: roleName = 'Admin'; break;
                default: roleName = 'Unknown';
            }
            
            // Update role badge
            const roleElement = goalElement.querySelector('.goal-role');
            if (roleElement) {
                roleElement.innerHTML = `<span class="status-badge badge-role">Your role: ${roleName}</span>`;
            }
            
        } catch (error) {
            console.error(`Error verifying role for (${owner}, ${index}):`, error);
            
            // Show error message in actions
            const actionsContainer = goalElement.querySelector('.goal-actions');
            if (actionsContainer) {
                actionsContainer.innerHTML = `
                    <div class="status-error">Error loading permissions: ${error.message}</div>
                `;
            }
            
            // Update role badge with error
            const roleElement = goalElement.querySelector('.goal-role');
            if (roleElement) {
                roleElement.innerHTML = `<span class="status-badge badge-role">Error loading role</span>`;
            }
        }
    }
    
    // Reintentar cargar un objetivo compartido
    async function retryLoadSharedGoal(owner, index) {
        console.log(`Retrying to load shared goal: owner=${owner}, index=${index}`);
        try {
            const [goals, indices] = await contract.getUserGoals(owner);
            
            // Encontrar el objetivo correcto
            for (let j = 0; j < indices.length; j++) {
                const goalIndex = typeof indices[j].toNumber === 'function' ? 
                                 indices[j].toNumber() : Number(indices[j]);
                
                if (goalIndex === index) {
                    // Verificar si el objetivo ha sido eliminado
                    if (goals[j].deleted === true) {
                        console.log(`Goal is marked as deleted, ignoring`);
                        alert("This goal is no longer available (it has been deleted)");
                        return;
                    }
                    
                    // Crear clave única para identificar el objetivo
                    const uniqueKey = `${owner.toLowerCase()}-${index}`;
                    
                    // Renderizar el objetivo
                    renderSharedGoalItem(goals[j], owner, index, uniqueKey);
                    
                    // Eliminar el elemento de error
                    const errorElements = Array.from(sharedGoalsList.querySelectorAll('.goal-item.error'));
                    for (const elem of errorElements) {
                        if (elem.textContent.includes(owner.substring(0, 6))) {
                            elem.remove();
                            break;
                        }
                    }
                    
                    return;
                }
            }
            
            // Si llegamos aquí, no se encontró el objetivo
            alert("The requested goal no longer exists");
            
        } catch (error) {
            console.error(`Error retrying loading shared goal:`, error);
            alert(`Error: ${error.message}`);
        }
    }
    
    // Función para reparar la vista de objetivos compartidos
    async function repairSharedGoalsView() {
        console.log("Repairing shared goals view...");
        
        // Show loading message
        if (sharedGoalsList) {
            sharedGoalsList.innerHTML = `
                <div class="status-message status-info">
                    <span class="loader"></span> Repairing shared goals data...
                </div>
            `;
        }
        
        try {
            // Clear interface state
            if (sharedGoalsCount) {
                sharedGoalsCount.textContent = "...";
            }
            
            // Force shared data update
            await loadSharedGoals();
            
            // Show success notification
            showNotification("View repaired", "The shared goals view has been repaired.", "success");
            
        } catch (error) {
            console.error("Error repairing view:", error);
            
            // Show error message
            if (sharedGoalsList) {
                sharedGoalsList.innerHTML = `
                    <div class="status-message status-error">
                        Error repairing view: ${error.message}
                    </div>
                `;
            }
            
            // Show error notification
            showNotification("Error", "Could not repair shared goals view.", "error");
        }
    }
    
    // Sistema de actualización periódica
    function setupAutoRefresh() {
        console.log("Setting up automatic refresh...");
        
        // Actualizar datos compartidos cada 30 segundos
        const REFRESH_INTERVAL = 30000; // 30 segundos
        
        // Función para actualizar datos compartidos
        function refreshSharedData() {
            console.log("Automatically updating shared data...");
            
            // Solo actualizar si estamos en la tab de compartidos
            if (tabSharedGoals && tabSharedGoals.classList.contains('active')) {
                loadSharedGoals();
            }
        }
        
        // Iniciar intervalo de actualización
        const refreshInterval = setInterval(refreshSharedData, REFRESH_INTERVAL);
        
        // También actualizar cuando el usuario cambie a la pestaña compartida
        if (tabSharedGoals) {
            tabSharedGoals.addEventListener('click', function() {
                // Actualizar inmediatamente al cambiar a esta pestaña
                setTimeout(refreshSharedData, 300); // Pequeño retraso para permitir cambio de UI
            });
        }
        
        // Escuchar eventos del contrato relacionados con compartir
        if (contract) {
            try {
                // Escuchar evento de revocación de acceso
                contract.on("UserAccessRevoked", (goalOwner, goalIndex, user) => {
                    console.log(`UserAccessRevoked event received: ${goalOwner}, ${goalIndex}, ${user}`);
                    
                    // Si el usuario revocado es el actual, actualizar la lista
                    if (user.toLowerCase() === userAccount.toLowerCase()) {
                        console.log("Access revoked for current user, updating list...");
                        loadSharedGoals();
                        
                        // Mostrar notificación
                        showNotification("Access revoked", "You no longer have access to a shared goal.", "warning");
                    }
                });
                
                // Escuchar evento de concesión de acceso
                contract.on("UserAccessGranted", (goalOwner, goalIndex, user, role, userName) => {
                    console.log(`UserAccessGranted event received: ${goalOwner}, ${goalIndex}, ${user}`);
                    
                    // Si el usuario al que se le da acceso es el actual, actualizar la lista
                    if (user.toLowerCase() === userAccount.toLowerCase()) {
                        console.log("New access granted to current user, updating list...");
                        loadSharedGoals();
                        
                        // Mostrar notificación
                        showNotification("New shared goal", "Someone has shared a goal with you.", "success");
                    }
                });
                
                console.log("Contract events configured correctly");
            } catch (error) {
                console.error("Error configuring contract events:", error);
            }
        }
        
        return {
            stop: function() {
                clearInterval(refreshInterval);
                // Desuscribirse de eventos
                if (contract) {
                    contract.removeAllListeners("UserAccessRevoked");
                    contract.removeAllListeners("UserAccessGranted");
                }
            }
        };
    }
    
    // Sistema de notificaciones sencillo
    function showNotification(title, message, type = "info") {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} notification-enter`;
        
        // Construir contenido
        notification.innerHTML = `
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        `;
        
        // Añadir al DOM
        const notificationsContainer = document.getElementById('notifications-container');
        
        // Si no existe el contenedor, crearlo
        if (!notificationsContainer) {
            const container = document.createElement('div');
            container.id = 'notifications-container';
            document.body.appendChild(container);
        }
        
        document.getElementById('notifications-container').appendChild(notification);
        
        // Eliminar después de 5 segundos
        setTimeout(() => {
            notification.classList.add('notification-exit');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
    
    // API pública
    return {
        init,
        showMyGoalsTab,
        showSharedGoalsTab,
        showShareModal,
        hideShareModal,
        confirmShareGoal,
        showAccessModal,
        hideAccessModal,
        revokeAccess,
        loadSharedGoals,
        retryLoadSharedGoal,
        refreshSharedData: function() {
            loadSharedGoals();
        },
        repairSharedGoalsView
    };
})();

// Función global para compartir objetivo desde HTML
window.shareGoalDirect = function(goalIndex) {
    console.log("shareGoalDirect function called directly for goal:", goalIndex);
    if (SharingManager) {
        SharingManager.showShareModal(goalIndex);
    } else {
        console.error("SharingManager is not defined");
        alert("Error: Could not access the sharing manager");
    }
};

// Crear contenedor de notificaciones cuando se inicializa
document.addEventListener('DOMContentLoaded', function() {
    // Crear contenedor para notificaciones
    if (!document.getElementById('notifications-container')) {
        const container = document.createElement('div');
        container.id = 'notifications-container';
        document.body.appendChild(container);
    }
});

// Exponer al objeto global para los botones
window.SharingManager = SharingManager;

// Inicializar automáticamente cuando se complete el evento walletConnected
document.addEventListener('walletConnected', function(event) {
    console.log("walletConnected event received in sharing.js");
    const { contract, userAccount } = event.detail;
    SharingManager.init(contract, userAccount);
});