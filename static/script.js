const blockForm = document.getElementById("block-form");
const blocksList = document.getElementById("blocks-list");
const parentBlockSelect = document.getElementById("parent_id");
const blockSelect = document.getElementById("block_select");

// Fetch and display blocks when the page loads
window.addEventListener("load", async () => {
    await loadBlocks();
    await loadParentBlockOptions();  // Load options for parent block select
});

// Function to load and display blocks hierarchically
async function loadBlocks() {
    const response = await fetch("/blocks", {
        method: "GET",
        headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
        console.error("Failed to load blocks:", response.statusText);
        return;
    }

    const blocks = await response.json();

    // Clear the block list before rendering
    blocksList.innerHTML = "";

    if (Array.isArray(blocks)) {
        renderBlocks(blocks);
    } else {
        console.error("Expected an array but got", blocks);
    }
}


// Recursive function to display blocks and their children
function renderBlocks(blocks, parentElement) {
    console.log("Rendering blocks:", blocks);  // Логирование всех блоков
    blocks.forEach(block => {
        const blockElement = document.createElement("div");
        blockElement.classList.add("block-item");

        const title_ru = block.title_ru || "Untitled";
        blockElement.innerHTML =
            `<strong>${title_ru}</strong>
            <button onclick="deleteBlock(${block.id})">Delete</button>`;

        if (parentElement) {
            parentElement.appendChild(blockElement);
        } else {
            blocksList.appendChild(blockElement);
        }

        console.log("Rendered block:", block);

        if (block.children && block.children.length > 0) {
            console.log("Rendering children of block ID:", block.id, block.children);  // Логируем детей
            renderBlocks(block.children, blockElement);
        }
    });
}



// Load all blocks and populate the dropdown with all blocks
async function loadParentBlockOptions() {
    parentBlockSelect.innerHTML = "<option value=''>None</option>";  // Добавляем опцию без родителя

    try {
        const response = await fetch("/blocks", {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) {
            console.error("Failed to load parent block options:", response.statusText);
            return;
        }

        const blocks = await response.json();
        if (Array.isArray(blocks)) {
            populateBlockOptions(blocks);  // Обновляем выпадающий список с блоками
        } else {
            console.error("Expected an array but got", blocks);
        }
    } catch (error) {
        console.error("Error loading parent block options:", error);
    }
}


// Recursive function to populate parent block dropdown options
function populateBlockOptions(blocks, level = 0) {
    blocks.forEach(block => {
        const option = document.createElement("option");
        option.value = block.id;
        option.textContent = "-".repeat(level) + " " + block.title_ru;  // Индентация в зависимости от уровня
        parentBlockSelect.appendChild(option);

        if (block.children && block.children.length > 0) {
            populateBlockOptions(block.children, level + 1);  // Увеличиваем уровень вложенности для детей
        }
    });
}

// Form submission for creating new blocks
blockForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(blockForm);
    const newBlock = {
        title_ru: formData.get("title_ru"),
        full_description_ru: formData.get("full_description_ru"),  // Добавляем поле для описания
        title_en: formData.get("title_en"),
        title_ar: formData.get("title_ar"),
        full_description_en: formData.get("full_description_en"),
        full_description_ar: formData.get("full_description_ar"),
        parent_id: formData.get("parent_id") || null
    };

    console.log("Creating new block:", newBlock);

    const response = await fetch("/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBlock)
    });

    if (response.ok) {
        console.log("Block created successfully");
        await loadParentBlockOptions();  // Reload parent block options
    } else {
        console.error("Error creating block:", response.statusText);
    }

    blockForm.reset();  // Clear form
    await loadBlocks();  // Reload block hierarchy
    console.log("Block hierarchy reloaded");  // Log hierarchy reload
});


// Delete a block function
async function deleteBlock(blockId) {
    if (confirm("Are you sure you want to delete this block?")) {
        const deleteUrl = `/blocks/${blockId}`;
        const response = await fetch(deleteUrl, { method: "DELETE" });

        if (response.ok) {
            await loadBlocks();  // Перезагружаем иерархию блоков
            await loadParentBlockOptions();  // Обновляем список родительских блоков
        } else {
            console.error("Error deleting block:", response.statusText);
        }
    }
}



// Load block options into the dropdown for editing
// Load block options into the dropdown for editing
async function loadBlockOptions() {
    const blockSelect = document.getElementById("block_select");  // Используем правильный элемент

    try {
        const response = await fetch("/blocks", {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) {
            console.error("Failed to load blocks:", response.statusText);
            return;
        }

        const blocks = await response.json();
        blockSelect.innerHTML = "<option value=''>Select Block</option>"; // Сбрасываем опции

        // Рекурсивная функция для добавления блоков и их детей
        function addBlocksToSelect(blocks, level = 0) {
            blocks.forEach(block => {
                const option = document.createElement("option");
                option.value = block.id;
                option.textContent = `${'—'.repeat(level)} ${block.title_ru}`;  // Визуальное представление иерархии
                blockSelect.appendChild(option);

                // Добавляем детей рекурсивно с увеличенным уровнем
                if (block.children && block.children.length > 0) {
                    addBlocksToSelect(block.children, level + 1);
                }
            });
        }

        addBlocksToSelect(blocks);  // Запускаем рекурсивное добавление блоков

    } catch (error) {
        console.error("Error loading blocks for editing:", error);
    }
}


function clearFormFields() {
    document.getElementById("block-form").reset();  // Очищаем форму

    // Сбрасываем выпадающий список на "Select Block"
    const blockSelect = document.getElementById("block_select");
    if (blockSelect) {
        blockSelect.value = "";
    }
}

// Load block details when a block is selected for editing
document.getElementById("block_select").addEventListener("change", async function () {
    const blockId = this.value;  // Получаем ID выбранного блока
    console.log("Selected Block ID:", blockId);  // Выводим ID для отладки
    if (blockId) {
        try {
            const response = await fetch(`/blocks/id/${blockId}`);  // Получаем информацию о блоке по его ID
            if (response.ok) {
                const data = await response.json();
                console.log("Block Data:", data);  // Выводим полученные данные для отладки

                // Заполняем поля данными блока
                document.getElementById("title_ru").value = data.title_ru || "";
                document.getElementById("full_description_ru").value = data.full_description_ru || "";
                document.getElementById("title_en").value = data.title_en || "";
                document.getElementById("full_description_en").value = data.full_description_en || "";
                document.getElementById("title_ar").value = data.title_ar || "";
                document.getElementById("full_description_ar").value = data.full_description_ar || "";

            } else {
                console.error("Failed to load block data. Status:", response.status);
            }
        } catch (error) {
            console.error("Error loading block data:", error);
        }
    } else {
        // Очищаем поля, если ничего не выбрано
        document.getElementById("title_ru").value = "";
        document.getElementById("full_description_ru").value = "";
        document.getElementById("title_en").value = "";
        document.getElementById("full_description_en").value = "";
        document.getElementById("title_ar").value = "";
        document.getElementById("full_description_ar").value = "";
    }
});


// Save the edited block
document.getElementById("save_button").addEventListener("click", async () => {
    const blockId = document.getElementById("block_select").value;

    if (!blockId) {
        alert("Please select a block to edit.");
        return;
    }

    const editedBlock = {
        title_ru: document.getElementById("title_ru").value,
        full_description_ru: document.getElementById("full_description_ru").value,
        title_en: document.getElementById("title_en").value,
        full_description_en: document.getElementById("full_description_en").value,
        title_ar: document.getElementById("title_ar").value,
        full_description_ar: document.getElementById("full_description_ar").value,
    };

    try {
        const response = await fetch(`/blocks/id/${blockId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editedBlock)
        });

        if (response.ok) {
            alert("Block updated successfully.");
            clearFormFields();
            await loadBlockOptions();
        } else {
            console.error("Error updating block:", response.statusText);
        }
    } catch (error) {
        console.error("Error saving block:", error);
    }
});


// Load block options on page load
window.addEventListener("load", loadBlockOptions);
