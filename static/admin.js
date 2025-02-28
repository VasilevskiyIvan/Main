const files = { image: [], video: [] };
const indices = { image: 0, video: 0 };

// Функция для удаления текущего изображения или видео
function deleteCurrentFile(type) {
    if (files[type].length === 0) {
        alert('Нет файлов для удаления!');
        return;
    }

    // Удаляем текущий файл из массива
    const currentIndex = indices[type];
    const removedFile = files[type].splice(currentIndex, 1)[0];

    // Освобождаем URL для удаленного файла
    URL.revokeObjectURL(removedFile.url);

    // Обновляем индекс и проверяем, если массив пуст
    if (files[type].length === 0) {
        indices[type] = 0;
        document.getElementById(`${type}Slider`).innerHTML =
            `<p>Добавьте ${type === 'image' ? 'изображения' : 'видео'} для предпросмотра</p>`;
        document.getElementById(`${type}Counter`).textContent = '0 / 0';
        document.getElementById(`${type}Controls`).style.display = 'none';
    } else {
        indices[type] = currentIndex % files[type].length; // Обновляем индекс
        renderSlider(type); // Перерисовываем слайдер
    }
}

// Функция для добавления фото или видео
function addFile(type) {
    const input = document.getElementById(`${type}Input`);
    const newFiles = Array.from(input.files);

    if (newFiles.length === 0) {
        alert('Пожалуйста, выберите файлы!');
        return;
    }

    newFiles.forEach((file) => {
        const fileURL = URL.createObjectURL(file);
        files[type].push({ file, url: fileURL });
    });

    renderSlider(type);
    input.value = ''; // Сброс поля загрузки
    document.getElementById(`${type}Controls`).style.display = 'flex';

    document.getElementById(`${type}FileName`).textContent = 'Не выбран файл';
}

// Функция для рендеринга слайдера (изображений или видео)
function renderSlider(type) {
    const slider = document.getElementById(`${type}Slider`);
    slider.innerHTML = '';
    files[type].forEach((file, index) => {
        const element =
            type === 'image'
                ? document.createElement('img')
                : document.createElement('video');

        element.src = file.url;
        element.classList.add(index === indices[type] ? 'active' : 'inactive');
        if (type === 'video') {
            element.controls = true;
        }

        slider.appendChild(element);
    });

    updateCounter(type);
}

// Функция для обновления счетчика на слайдере (изображений или видео)
function updateCounter(type) {
    const counter = document.getElementById(`${type}Counter`);
    counter.textContent = `${indices[type] + 1} / ${files[type].length}`;
}

function prevSlide(sliderId, type) {
    const total = files[type].length;
    indices[type] = (indices[type] - 1 + total) % total;
    renderSlider(type);
}

function nextSlide(sliderId, type) {
    const total = files[type].length;
    indices[type] = (indices[type] + 1) % total;
    renderSlider(type);
}

async function submitForm() {
    const formData = new FormData(document.getElementById('blockForm'));

    // Добавляем изображения и видео в formData
    files.image.forEach((item, index) => {
        formData.append(`images`, item.file);
    });
    files.video.forEach((item, index) => {
        formData.append(`videos`, item.file);
    });

    try {
        const response = await fetch('/blocks/new', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Ошибка при сохранении блока');
        }

        alert('Блок успешно сохранен!');
        window.location.reload();
    } catch (error) {
        console.error(error);
        alert('Произошла ошибка при сохранении блока.');
    }
}

function updateFileName(type) {
    const input = document.getElementById(`${type}Input`);
    const fileName = document.getElementById(`${type}FileName`);

    // Если выбраны файлы, показываем их имена
    if (input.files.length > 0) {
        fileName.textContent = `${input.files.length} файлов выбрано: ` + Array.from(input.files).map(file => file.name).join(', ');
    } else {
        fileName.textContent = 'Не выбран файл';
    }
}

function updateLanguageIndicator(language) {
    const indicator = document.getElementById(`indicator_${language}`);
    const titleInput = document.getElementById(`title_${language}`);
    const contentInput = document.getElementById(`content_${language}`);

    if (titleInput.value.trim() !== "" && contentInput.value.trim() !== "") {
        indicator.classList.add('active-indicator');
    } else {
        indicator.classList.remove('active-indicator');
    }
}

// Функция для отображения блока соответствующего языка
function showLanguageBlock() {
    const selectedLanguage = document.getElementById('languageSelect').value;
    const allBlocks = document.querySelectorAll('.language-block');
    allBlocks.forEach(block => {
        block.classList.remove('active-language');
    });

    if (selectedLanguage) {
        document.getElementById(`block_${selectedLanguage}`).classList.add('active-language');
    }
}

function addLanguage() {
    const selectedLanguage = document.getElementById('languageSelect').value;
    const languageSelect = document.getElementById('languageSelect');
    const options = languageSelect.querySelectorAll('option');
    let nextLanguage = false;

    options.forEach(option => {
        if (nextLanguage && option.value) {
            languageSelect.value = option.value;
            showLanguageBlock();
            nextLanguage = false;
        }
        if (option.value === selectedLanguage) {
            nextLanguage = true;
        }
    });
}

// admin.js
async function submitForm() {
    try {
        const formData = new FormData(document.getElementById('mainForm'));

        // Добавляем файлы
        files.image.forEach(item => formData.append('images', item.file));
        files.video.forEach(item => formData.append('videos', item.file));

        const response = await fetch('/blocks/new', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            alert('Блок успешно сохранен!');
            window.location.href = '/';
        } else {
            throw new Error('Ошибка сохранения');
        }
    } catch (error) {
        console.error(error);
        alert('Ошибка при сохранении блока: ' + error.message);
    }
}

async function sendBroadcast() {
    const formData = new FormData(document.getElementById('mainForm'));
    const userId = document.getElementById('userSelect').value;

    formData.append('user_id', userId);

    try {
        const response = await fetch('/send', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) throw new Error('Ошибка рассылки');
        alert('Рассылка успешно отправлена!');
    } catch (error) {
        console.error(error);
        alert('Ошибка при отправке рассылки');
    }
}