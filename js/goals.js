/**
 * goals.js
 * Maneja la funcionalidad relacionada con la creación y gestión de objetivos
 */

const GoalManager = (() => {
    // Variables locales
    let contract;
    let userAccount;
    let goalToDelete = { owner: null, index: -1 };
    let goalToEdit = { owner: null, index: -1 };
    
    // DOM elements
    let goalText, deadline, addGoalBtn, goalsList, deleteModal, modalCancel, modalConfirm, 
        editModal, editText, editDeadline, editCancel, editConfirm;
    
    // Inicialización
    function init(contractInstance, account) {
        console.log("Initializing GoalManager...");
        contract = contractInstance;
        userAccount = account;
        
        // Obtener referencias a los elementos DOM
        goalText = document.getElementById('goal-text');
        deadline = document.getElementById('deadline');
        addGoalBtn = document.getElementById('add-goal');
        goalsList = document.getElementById('goals-list');
        deleteModal = document.getElementById('delete-modal');
        modalCancel = document.getElementById('modal-cancel');
        modalConfirm = document.getElementById('modal-confirm');
        editModal = document.getElementById('edit-modal');
        editText = document.getElementById('edit-text');
        editDeadline = document.getElementById('edit-deadline');
        editCancel = document.getElementById('edit-cancel');
        editConfirm = document.getElementById('edit-confirm');
        
        // Verificar que los elementos existen
        if (!addGoalBtn) {
            console.error("Error: Element 'add-goal' not found");
            return;
        }
        
        console.log("DOM elements for goals found, setting up events...");
        
        // Usar onclick directo en lugar de addEventListener
        addGoalBtn.onclick = function() {
            console.log("Save Goal button clicked");
            createGoal();
        };
        
        if (modalCancel) modalCancel.onclick = hideDeleteModal;
        if (modalConfirm) modalConfirm.onclick = confirmDeleteGoal;
        if (editCancel) editCancel.onclick = hideEditModal;
        if (editConfirm) editConfirm.onclick = confirmEditGoal;
        
        // Cargar objetivos iniciales
        console.log("Loading initial goals...");
        loadMyGoals();
    }
    
    // Crear un nuevo objetivo
    async function createGoal() {
        console.log("createGoal function called");
        try {
            const text = goalText.value.trim();
            const deadlineDate = new Date(deadline.value);
            
            console.log("Form data:", { text, deadline: deadline.value, deadlineDate });
            
            if (!text) {
                alert("Please enter a goal");
                return;
            }
            
            if (isNaN(deadlineDate.getTime())) {
                alert("Please select a valid deadline");
                return;
            }
            
            // Verificar que la fecha es futura
            const now = new Date();
            if (deadlineDate < now) {
                alert("Deadline must be in the future");
                return;
            }
            
            // Convertir fecha a timestamp Unix (segundos)
            const deadlineTimestamp = Math.floor(deadlineDate.getTime() / 1000);
            console.log("Calculated timestamp:", deadlineTimestamp);
            
            // Deshabilitar botón mientras se procesa
            addGoalBtn.disabled = true;
            addGoalBtn.innerHTML = "<span class='loader'></span> Saving...";
            
            // Verificar que tenemos el contrato
            if (!contract) {
                console.error("Error: Contract not initialized");
                alert("Error: Could not connect to the contract. Please reload the page.");
                addGoalBtn.disabled = false;
                addGoalBtn.textContent = "Save Goal";
                return;
            }
            
            // Mostrar información de depuración
            console.log("Calling contract:", {
                method: "addGoal",
                text: text,
                deadline: deadlineTimestamp,
                contract: contract.address
            });
            
            // Llamar al contrato con manejo de errores explícito
            try {
                // Primer intento - con la función original
                console.log("Attempting to call addGoal...");
                const tx = await contract.addGoal(text, deadlineTimestamp);
                console.log("Transaction sent:", tx.hash);
                console.log("Waiting for confirmation...");
                await tx.wait();
                console.log("Transaction confirmed!");
            } catch (contractError) {
                console.error("Specific error calling the contract:", contractError);
                
                // Si hay un error, intenta una versión alternativa
                if (contractError.message.includes("parameters") || 
                    contractError.message.includes("arguments") ||
                    contractError.message.includes("wrong number")) {
                    
                    console.log("Trying alternative version of function...");
                    try {
                        // Alternativa: En algunos contratos addGoal podría tener más parámetros
                        // Intenta solo con los parámetros obligatorios
                        const tx = await contract.addGoal(text, deadlineTimestamp);
                        console.log("Alternative transaction sent:", tx.hash);
                        await tx.wait();
                        console.log("Alternative transaction confirmed!");
                    } catch (altError) {
                        throw new Error(`Error in alternative attempt: ${altError.message}`);
                    }
                } else {
                    throw contractError;
                }
            }
            
            // Limpiar campos
            goalText.value = "";
            deadline.value = "";
            
            // Recargar objetivos
            console.log("Reloading goals...");
            loadMyGoals();
            
            // Mostrar mensaje de éxito
            alert("Goal saved successfully!");
            
        } catch (error) {
            console.error("Error creating goal:", error);
            alert(`Error saving goal: ${error.message}`);
        } finally {
            addGoalBtn.disabled = false;
            addGoalBtn.textContent = "Save Goal";
        }
    }
    
    // Marcar objetivo como completado
    async function completeGoal(owner, index) {
        console.log(`Completing goal: owner=${owner}, index=${index}`);
        try {
            const completeButton = document.getElementById(`complete-button-${owner}-${index}`);
            if (completeButton) {
                completeButton.innerHTML = "<span class='loader'></span> Processing...";
                completeButton.disabled = true;
            }
            
            const tx = await contract.completeGoal(owner, index);
            console.log("Transaction sent:", tx.hash);
            await tx.wait();
            console.log("Goal completed!");
            
            // Recargar objetivos según la pestaña actual
            if (owner === userAccount) {
                loadMyGoals();
            } else {
                SharingManager.loadSharedGoals();
            }
            
        } catch (error) {
            console.error("Error completing goal:", error);
            alert(`Error: ${error.message}`);
            const completeButton = document.getElementById(`complete-button-${owner}-${index}`);
            if (completeButton) {
                completeButton.textContent = "Mark Complete";
                completeButton.disabled = false;
            }
        }
    }
    
    // Mostrar modal de eliminación
    function showDeleteModal(owner, index) {
        console.log(`Showing delete modal: owner=${owner}, index=${index}`);
        goalToDelete = { owner, index };
        if (deleteModal) deleteModal.classList.add('active');
    }
    
    // Ocultar modal de eliminación
    function hideDeleteModal() {
        console.log("Hiding delete modal");
        if (deleteModal) deleteModal.classList.remove('active');
        goalToDelete = { owner: null, index: -1 };
    }
    
    // Eliminar objetivo (después de confirmación)
    async function confirmDeleteGoal() {
        console.log("Confirming deletion:", goalToDelete);
        if (!goalToDelete.owner || goalToDelete.index < 0) return;
        
        try {
            if (modalConfirm) {
                modalConfirm.innerHTML = "<span class='loader'></span> Deleting...";
                modalConfirm.disabled = true;
            }
            
            const tx = await contract.deleteGoal(goalToDelete.owner, goalToDelete.index);
            console.log("Transaction sent:", tx.hash);
            await tx.wait();
            console.log("Goal deleted!");
            
            hideDeleteModal();
            
            // Recargar la vista correcta
            if (goalToDelete.owner === userAccount) {
                loadMyGoals();
            } else {
                SharingManager.loadSharedGoals();
            }
            
        } catch (error) {
            console.error("Error deleting goal:", error);
            alert(`Error: ${error.message}`);
        } finally {
            if (modalConfirm) {
                modalConfirm.innerHTML = "Delete Goal";
                modalConfirm.disabled = false;
            }
        }
    }
    
    // Mostrar modal de edición
    function showEditModal(owner, index, text, deadlineTimestamp) {
        console.log(`Showing edit modal: owner=${owner}, index=${index}`);
        goalToEdit = { owner, index };
        
        // Llenar los campos con datos actuales
        if (editText) editText.value = text;
        
        // Convertir timestamp a formato de fecha para el input
        if (editDeadline) {
            const date = new Date(deadlineTimestamp * 1000);
            const formattedDate = date.toISOString().split('T')[0];
            editDeadline.value = formattedDate;
        }
        
        // Mostrar modal
        if (editModal) editModal.classList.add('active');
    }
    
    // Ocultar modal de edición
    function hideEditModal() {
        console.log("Hiding edit modal");
        if (editModal) editModal.classList.remove('active');
        goalToEdit = { owner: null, index: -1 };
    }
    
    // Editar objetivo (después de confirmar en el modal)
    async function confirmEditGoal() {
        console.log("Confirming edit:", goalToEdit);
        if (!goalToEdit.owner || goalToEdit.index < 0) return;
        
        try {
            const text = editText.value.trim();
            const deadlineDate = new Date(editDeadline.value);
            
            if (!text) {
                alert("Please enter a goal text");
                return;
            }
            
            if (isNaN(deadlineDate.getTime())) {
                alert("Please select a valid deadline");
                return;
            }
            
            // Convertir fecha a timestamp Unix (segundos)
            const deadlineTimestamp = Math.floor(deadlineDate.getTime() / 1000);
            
            // Deshabilitar botón mientras se procesa
            if (editConfirm) {
                editConfirm.innerHTML = "<span class='loader'></span> Saving...";
                editConfirm.disabled = true;
            }
            
            // Llamar al contrato
            const tx = await contract.editGoal(
                goalToEdit.owner, 
                goalToEdit.index, 
                text, 
                deadlineTimestamp
            );
            console.log("Transaction sent:", tx.hash);
            await tx.wait();
            console.log("Goal edited!");
            
            hideEditModal();
            
            // Recargar la vista correcta
            if (goalToEdit.owner === userAccount) {
                loadMyGoals();
            } else {
                SharingManager.loadSharedGoals();
            }
            
        } catch (error) {
            console.error("Error editing goal:", error);
            alert(`Error: ${error.message}`);
        } finally {
            if (editConfirm) {
                editConfirm.innerHTML = "Save Changes";
                editConfirm.disabled = false;
            }
        }
    }
    
    // Cargar mis objetivos
    async function loadMyGoals() {
        console.log("Loading my goals...");
        try {
            // Verificar que tenemos el contrato y la cuenta
            if (!contract) {
                console.error("Error: Contract not initialized");
                return;
            }
            
            if (!userAccount) {
                console.error("Error: No user account");
                return;
            }
            
            console.log("Requesting goals for account:", userAccount);
            
            // Llamar al contrato para obtener objetivos
            let goals, indices;
            
            try {
                // Primero intenta con la función que devuelve dos valores (array de objetivos y array de índices)
                const result = await contract.getUserGoals(userAccount);
                console.log("Result obtained:", result);
                
                // Comprobamos si el resultado es un array con dos elementos (como se espera)
                if (Array.isArray(result) && result.length === 2) {
                    [goals, indices] = result;
                } else {
                    // Si no es un array de dos elementos, podría ser que la función solo devuelve los objetivos
                    goals = result;
                    // En este caso, creamos un array de índices manualmente
                    indices = Array.from({ length: goals.length }, (_, i) => i);
                }
            } catch (error) {
                console.error("Error getting goals:", error);
                
                // Intentar con versión alternativa que no requiere parámetros
                console.log("Trying alternative version without parameters...");
                try {
                    const result = await contract.getUserGoals();
                    
                    // Manejar el resultado según su estructura
                    if (Array.isArray(result) && result.length === 2) {
                        [goals, indices] = result;
                    } else {
                        goals = result;
                        indices = Array.from({ length: goals.length }, (_, i) => i);
                    }
                } catch (altError) {
                    throw new Error(`Could not get goals: ${altError.message}`);
                }
            }
            
            // Limpiar lista
            if (!goalsList) {
                console.error("Error: Element 'goals-list' not found");
                return;
            }
            
            goalsList.innerHTML = '';
            
            if (!goals || goals.length === 0) {
                console.log("No goals found");
                goalsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📝</div>
                        <div class="empty-state-text">You don't have any goals yet. Add your first goal above.</div>
                    </div>
                `;
                return;
            }
            
            console.log(`Found ${goals.length} goals`);
            
            // Añadir cada objetivo a la lista
            goals.forEach((goal, arrayIndex) => {
                const index = indices[arrayIndex].toNumber ? indices[arrayIndex].toNumber() : indices[arrayIndex];
                console.log(`Rendering goal ${index}:`, goal);
                renderGoalItem(goal, userAccount, index);
            });
            
        } catch (error) {
            console.error("Error loading goals:", error);
            if (goalsList) {
                goalsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-text">Error loading goals: ${error.message}. Please try again.</div>
                    </div>
                `;
            }
        }
    }
    
    // Renderizar un elemento de objetivo
    function renderGoalItem(goal, owner, index) {
        console.log(`Rendering goal: owner=${owner}, index=${index}`);
        const goalElement = document.createElement('div');
        
        // Obtener valores asegurándose de que sean de tipo primitivo (no BigNumber)
        const deadline = typeof goal.deadline === 'object' && goal.deadline.toNumber ? 
                        goal.deadline.toNumber() : Number(goal.deadline);
        const completed = goal.completed === true; // Asegurarse de que es un booleano
        
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
        
        // Convertir timestamp a fecha legible
        let deadlineDate;
        try {
            deadlineDate = new Date(deadline * 1000).toLocaleDateString();
        } catch (error) {
            console.error("Error formatting date:", error);
            deadlineDate = "Invalid date";
        }
        
        // Mostrar propietario si es un objetivo compartido
        let ownerInfo = '';
        if (owner !== userAccount) {
            ownerInfo = `
                <div class="goal-owner">
                    <span class="goal-owner-icon">👤</span>
                    <span>Created by: ${owner.substring(0, 6)}...${owner.substring(38)}</span>
                </div>
            `;
        }
        
        // Escapar texto del objetivo para evitar problemas con comillas
        const escapedText = typeof goal.text === 'string' ? 
                           goal.text.replace(/"/g, '&quot;') : 
                           'Goal without text';
        
        // Construir elemento HTML (usando IDs únicos para los botones)
        // Ahora los botones dependen del estado del goal
        goalElement.innerHTML = `
            ${ownerInfo}
            <div class="goal-title">
                <span>${goal.text}</span>
                ${statusBadge}
            </div>
            <div class="goal-deadline">Deadline: ${deadlineDate}</div>
            <div class="goal-actions">
                ${!completed && !isExpired ? 
                    `<button id="complete-button-${owner}-${index}" 
                        class="sf-button">Mark Complete</button>
                    <button id="edit-button-${owner}-${index}" 
                        class="sf-button">Edit</button>` : ''}
                
                <button id="access-button-${index}"
                    class="sf-button">Manage Access</button>
                
                <button id="delete-button-${owner}-${index}" 
                    class="sf-button sf-button-danger">Delete</button>
            </div>
        `;
        
        // Añadir el elemento al DOM
        if (goalsList) {
            goalsList.appendChild(goalElement);
            
            // Configurar event listeners para los botones
            if (!completed && !isExpired) {
                const completeBtn = document.getElementById(`complete-button-${owner}-${index}`);
                if (completeBtn) {
                    completeBtn.onclick = () => completeGoal(owner, index);
                }
                
                const editBtn = document.getElementById(`edit-button-${owner}-${index}`);
                if (editBtn) {
                    editBtn.onclick = () => showEditModal(owner, index, escapedText, deadline);
                }
            }
            
            const deleteBtn = document.getElementById(`delete-button-${owner}-${index}`);
            if (deleteBtn) {
                deleteBtn.onclick = () => showDeleteModal(owner, index);
            }
            
            const accessBtn = document.getElementById(`access-button-${index}`);
            if (accessBtn && window.SharingManager) {
                accessBtn.onclick = () => window.SharingManager.showAccessModal(index);
            }
        }
    }
    
    // API pública
    return {
        init,
        createGoal,
        completeGoal,
        showDeleteModal,
        hideDeleteModal,
        confirmDeleteGoal,
        showEditModal,
        hideEditModal,
        confirmEditGoal,
        loadMyGoals,
        renderGoalItem
    };
})();

// Función global para crear objetivo desde HTML
window.createGoalDirect = function() {
    console.log("createGoalDirect function called directly");
    if (GoalManager) {
        GoalManager.createGoal();
    } else {
        console.error("GoalManager is not defined");
        alert("Error: Could not access the goal manager");
    }
};

// Exponer al objeto global para los botones
window.GoalManager = GoalManager;

// Inicializar automáticamente cuando se complete el evento walletConnected
document.addEventListener('walletConnected', function(event) {
    console.log("walletConnected event received in goals.js");
    const { contract, userAccount } = event.detail;
    GoalManager.init(contract, userAccount);
});