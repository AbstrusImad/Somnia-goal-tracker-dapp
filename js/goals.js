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
        console.log("Inicializando GoalManager...");
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
            console.error("Error: Elemento 'add-goal' no encontrado");
            return;
        }
        
        console.log("Elementos DOM para goals encontrados, configurando eventos...");
        
        // Usar onclick directo en lugar de addEventListener
        addGoalBtn.onclick = function() {
            console.log("Botón Save Goal clickeado");
            createGoal();
        };
        
        if (modalCancel) modalCancel.onclick = hideDeleteModal;
        if (modalConfirm) modalConfirm.onclick = confirmDeleteGoal;
        if (editCancel) editCancel.onclick = hideEditModal;
        if (editConfirm) editConfirm.onclick = confirmEditGoal;
        
        // Cargar objetivos iniciales
        console.log("Cargando objetivos iniciales...");
        loadMyGoals();
    }
    
    // Crear un nuevo objetivo
    async function createGoal() {
        console.log("Función createGoal llamada");
        try {
            const text = goalText.value.trim();
            const deadlineDate = new Date(deadline.value);
            
            console.log("Datos del formulario:", { text, deadline: deadline.value, deadlineDate });
            
            if (!text) {
                alert("Por favor ingresa un objetivo");
                return;
            }
            
            if (isNaN(deadlineDate.getTime())) {
                alert("Por favor selecciona una fecha límite válida");
                return;
            }
            
            // Verificar que la fecha es futura
            const now = new Date();
            if (deadlineDate < now) {
                alert("La fecha límite debe ser en el futuro");
                return;
            }
            
            // Convertir fecha a timestamp Unix (segundos)
            const deadlineTimestamp = Math.floor(deadlineDate.getTime() / 1000);
            console.log("Timestamp calculado:", deadlineTimestamp);
            
            // Deshabilitar botón mientras se procesa
            addGoalBtn.disabled = true;
            addGoalBtn.innerHTML = "<span class='loader'></span> Guardando...";
            
            // Verificar que tenemos el contrato
            if (!contract) {
                console.error("Error: Contrato no inicializado");
                alert("Error: No se ha podido conectar con el contrato. Por favor, recarga la página.");
                addGoalBtn.disabled = false;
                addGoalBtn.textContent = "Guardar Objetivo";
                return;
            }
            
            // Mostrar información de depuración
            console.log("Llamando al contrato:", {
                método: "addGoal",
                texto: text,
                deadline: deadlineTimestamp,
                contrato: contract.address
            });
            
            // Llamar al contrato con manejo de errores explícito
            try {
                // Primer intento - con la función original
                console.log("Intentando llamar a addGoal...");
                const tx = await contract.addGoal(text, deadlineTimestamp);
                console.log("Transacción enviada:", tx.hash);
                console.log("Esperando confirmación...");
                await tx.wait();
                console.log("Transacción confirmada!");
            } catch (contractError) {
                console.error("Error específico al llamar al contrato:", contractError);
                
                // Si hay un error, intenta una versión alternativa
                if (contractError.message.includes("parameters") || 
                    contractError.message.includes("arguments") ||
                    contractError.message.includes("wrong number")) {
                    
                    console.log("Intentando versión alternativa de la función...");
                    try {
                        // Alternativa: En algunos contratos addGoal podría tener más parámetros
                        // Intenta solo con los parámetros obligatorios
                        const tx = await contract.addGoal(text, deadlineTimestamp);
                        console.log("Transacción alternativa enviada:", tx.hash);
                        await tx.wait();
                        console.log("Transacción alternativa confirmada!");
                    } catch (altError) {
                        throw new Error(`Error en intento alternativo: ${altError.message}`);
                    }
                } else {
                    throw contractError;
                }
            }
            
            // Limpiar campos
            goalText.value = "";
            deadline.value = "";
            
            // Recargar objetivos
            console.log("Recargando objetivos...");
            loadMyGoals();
            
            // Mostrar mensaje de éxito
            alert("¡Objetivo guardado con éxito!");
            
        } catch (error) {
            console.error("Error al crear objetivo:", error);
            alert(`Error al guardar el objetivo: ${error.message}`);
        } finally {
            addGoalBtn.disabled = false;
            addGoalBtn.textContent = "Save Goal";
        }
    }
    
    // Marcar objetivo como completado
    async function completeGoal(owner, index) {
        console.log(`Completando objetivo: owner=${owner}, index=${index}`);
        try {
            const completeButton = document.getElementById(`complete-button-${owner}-${index}`);
            if (completeButton) {
                completeButton.innerHTML = "<span class='loader'></span> Procesando...";
                completeButton.disabled = true;
            }
            
            const tx = await contract.completeGoal(owner, index);
            console.log("Transacción enviada:", tx.hash);
            await tx.wait();
            console.log("Objetivo completado!");
            
            // Recargar objetivos según la pestaña actual
            if (owner === userAccount) {
                loadMyGoals();
            } else {
                SharingManager.loadSharedGoals();
            }
            
        } catch (error) {
            console.error("Error al completar objetivo:", error);
            alert(`Error: ${error.message}`);
            const completeButton = document.getElementById(`complete-button-${owner}-${index}`);
            if (completeButton) {
                completeButton.textContent = "Marcar Completado";
                completeButton.disabled = false;
            }
        }
    }
    
    // Mostrar modal de eliminación
    function showDeleteModal(owner, index) {
        console.log(`Mostrando modal de eliminación: owner=${owner}, index=${index}`);
        goalToDelete = { owner, index };
        if (deleteModal) deleteModal.classList.add('active');
    }
    
    // Ocultar modal de eliminación
    function hideDeleteModal() {
        console.log("Ocultando modal de eliminación");
        if (deleteModal) deleteModal.classList.remove('active');
        goalToDelete = { owner: null, index: -1 };
    }
    
    // Eliminar objetivo (después de confirmación)
    async function confirmDeleteGoal() {
        console.log("Confirmando eliminación:", goalToDelete);
        if (!goalToDelete.owner || goalToDelete.index < 0) return;
        
        try {
            if (modalConfirm) {
                modalConfirm.innerHTML = "<span class='loader'></span> Eliminando...";
                modalConfirm.disabled = true;
            }
            
            const tx = await contract.deleteGoal(goalToDelete.owner, goalToDelete.index);
            console.log("Transacción enviada:", tx.hash);
            await tx.wait();
            console.log("Objetivo eliminado!");
            
            hideDeleteModal();
            
            // Recargar la vista correcta
            if (goalToDelete.owner === userAccount) {
                loadMyGoals();
            } else {
                SharingManager.loadSharedGoals();
            }
            
        } catch (error) {
            console.error("Error al eliminar objetivo:", error);
            alert(`Error: ${error.message}`);
        } finally {
            if (modalConfirm) {
                modalConfirm.innerHTML = "Eliminar Objetivo";
                modalConfirm.disabled = false;
            }
        }
    }
    
    // Mostrar modal de edición
    function showEditModal(owner, index, text, deadlineTimestamp) {
        console.log(`Mostrando modal de edición: owner=${owner}, index=${index}`);
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
        console.log("Ocultando modal de edición");
        if (editModal) editModal.classList.remove('active');
        goalToEdit = { owner: null, index: -1 };
    }
    
    // Editar objetivo (después de confirmar en el modal)
    async function confirmEditGoal() {
        console.log("Confirmando edición:", goalToEdit);
        if (!goalToEdit.owner || goalToEdit.index < 0) return;
        
        try {
            const text = editText.value.trim();
            const deadlineDate = new Date(editDeadline.value);
            
            if (!text) {
                alert("Por favor ingresa un texto para el objetivo");
                return;
            }
            
            if (isNaN(deadlineDate.getTime())) {
                alert("Por favor selecciona una fecha límite válida");
                return;
            }
            
            // Convertir fecha a timestamp Unix (segundos)
            const deadlineTimestamp = Math.floor(deadlineDate.getTime() / 1000);
            
            // Deshabilitar botón mientras se procesa
            if (editConfirm) {
                editConfirm.innerHTML = "<span class='loader'></span> Guardando...";
                editConfirm.disabled = true;
            }
            
            // Llamar al contrato
            const tx = await contract.editGoal(
                goalToEdit.owner, 
                goalToEdit.index, 
                text, 
                deadlineTimestamp
            );
            console.log("Transacción enviada:", tx.hash);
            await tx.wait();
            console.log("Objetivo editado!");
            
            hideEditModal();
            
            // Recargar la vista correcta
            if (goalToEdit.owner === userAccount) {
                loadMyGoals();
            } else {
                SharingManager.loadSharedGoals();
            }
            
        } catch (error) {
            console.error("Error al editar objetivo:", error);
            alert(`Error: ${error.message}`);
        } finally {
            if (editConfirm) {
                editConfirm.innerHTML = "Guardar Cambios";
                editConfirm.disabled = false;
            }
        }
    }
    
    // Cargar mis objetivos
    async function loadMyGoals() {
        console.log("Cargando mis objetivos...");
        try {
            // Verificar que tenemos el contrato y la cuenta
            if (!contract) {
                console.error("Error: Contrato no inicializado");
                return;
            }
            
            if (!userAccount) {
                console.error("Error: No hay cuenta de usuario");
                return;
            }
            
            console.log("Solicitando objetivos para la cuenta:", userAccount);
            
            // Llamar al contrato para obtener objetivos
            let goals, indices;
            
            try {
                // Primero intenta con la función que devuelve dos valores (array de objetivos y array de índices)
                const result = await contract.getUserGoals(userAccount);
                console.log("Resultado obtenido:", result);
                
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
                console.error("Error al obtener objetivos:", error);
                
                // Intentar con versión alternativa que no requiere parámetros
                console.log("Intentando versión alternativa sin parámetros...");
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
                    throw new Error(`No se pudieron obtener los objetivos: ${altError.message}`);
                }
            }
            
            // Limpiar lista
            if (!goalsList) {
                console.error("Error: Elemento 'goals-list' no encontrado");
                return;
            }
            
            goalsList.innerHTML = '';
            
            if (!goals || goals.length === 0) {
                console.log("No se encontraron objetivos");
                goalsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📝</div>
                        <div class="empty-state-text">Aún no tienes objetivos. Añade tu primer objetivo arriba.</div>
                    </div>
                `;
                return;
            }
            
            console.log(`Se encontraron ${goals.length} objetivos`);
            
            // Añadir cada objetivo a la lista
            goals.forEach((goal, arrayIndex) => {
                const index = indices[arrayIndex].toNumber ? indices[arrayIndex].toNumber() : indices[arrayIndex];
                console.log(`Renderizando objetivo ${index}:`, goal);
                renderGoalItem(goal, userAccount, index);
            });
            
        } catch (error) {
            console.error("Error al cargar objetivos:", error);
            if (goalsList) {
                goalsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-text">Error al cargar objetivos: ${error.message}. Por favor intenta de nuevo.</div>
                    </div>
                `;
            }
        }
    }
    
    // Renderizar un elemento de objetivo
    function renderGoalItem(goal, owner, index) {
        console.log(`Renderizando objetivo: owner=${owner}, index=${index}`);
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
            statusBadge = '<span class="status-badge badge-completed">Completado</span>';
        } else if (isExpired) {
            statusBadge = '<span class="status-badge badge-expired">Expirado</span>';
        } else {
            statusBadge = '<span class="status-badge badge-pending">En Progreso</span>';
        }
        
        // Convertir timestamp a fecha legible
        let deadlineDate;
        try {
            deadlineDate = new Date(deadline * 1000).toLocaleDateString();
        } catch (error) {
            console.error("Error al formatear fecha:", error);
            deadlineDate = "Fecha inválida";
        }
        
        // Mostrar propietario si es un objetivo compartido
        let ownerInfo = '';
        if (owner !== userAccount) {
            ownerInfo = `
                <div class="goal-owner">
                    <span class="goal-owner-icon">👤</span>
                    <span>Creado por: ${owner.substring(0, 6)}...${owner.substring(38)}</span>
                </div>
            `;
        }
        
        // Escapar texto del objetivo para evitar problemas con comillas
        const escapedText = goal.text.replace(/"/g, '&quot;');
        
        // Construir elemento HTML (usando IDs únicos para los botones)
        goalElement.innerHTML = `
            ${ownerInfo}
            <div class="goal-title">
                <span>${goal.text}</span>
                ${statusBadge}
            </div>
            <div class="goal-deadline">Fecha límite: ${deadlineDate}</div>
            <div class="goal-actions">
                ${!completed && !isExpired ? 
                    `<button id="complete-button-${owner}-${index}" 
                        class="sf-button">Marcar Completado</button>` : ''}
                
                <button id="edit-button-${owner}-${index}" 
                    class="sf-button">Editar</button>
                
                <button id="share-button-${index}" 
                    class="sf-button">Compartir</button>
                
                <button id="delete-button-${owner}-${index}" 
                    class="sf-button sf-button-danger">Eliminar</button>
                
                <button id="access-button-${index}"
                    class="sf-button">Gestionar Acceso</button>
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
            }
            
            const editBtn = document.getElementById(`edit-button-${owner}-${index}`);
            if (editBtn) {
                editBtn.onclick = () => showEditModal(owner, index, escapedText, deadline);
            }
            
            const deleteBtn = document.getElementById(`delete-button-${owner}-${index}`);
            if (deleteBtn) {
                deleteBtn.onclick = () => showDeleteModal(owner, index);
            }
            
            const shareBtn = document.getElementById(`share-button-${index}`);
            if (shareBtn && window.SharingManager) {
                shareBtn.onclick = () => window.SharingManager.showShareModal(index);
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
    console.log("Función createGoalDirect llamada directamente");
    if (GoalManager) {
        GoalManager.createGoal();
    } else {
        console.error("GoalManager no está definido");
        alert("Error: No se pudo acceder al administrador de objetivos");
    }
};

// Exponer al objeto global para los botones
window.GoalManager = GoalManager;

// Inicializar automáticamente cuando se complete el evento walletConnected
document.addEventListener('walletConnected', function(event) {
    console.log("Evento walletConnected recibido en goals.js");
    const { contract, userAccount } = event.detail;
    GoalManager.init(contract, userAccount);
});