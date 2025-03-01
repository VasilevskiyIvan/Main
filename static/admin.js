const files = { image: [], video: [], other: [] };
const indices = { image: 0, video: 0, other: 0 };
let currentBlockId = null;
let initialMedia = { images: [], videos: [], others: [] };

// Общие функции для работы с медиа
function renderSlider(type) {
    if (type === 'other') return;

    const slider = document.getElementById(`${type}Slider`);
    slider.innerHTML = '';
    files[type].forEach((file, index) => {
        const element = type === 'image'
            ? document.createElement('img')
            : document.createElement('video');

        element.src = file.url;
        element.classList.add(index === indices[type] ? 'active' : 'inactive');
        if (type === 'video') element.controls = true;

        slider.appendChild(element);
    });
    updateCounter(type);
}

function renderFileList() {
    const list = document.getElementById('otherFilesList');
    list.innerHTML = '';

    files.other.forEach((file, index) => {
        const div = document.createElement('div');
        div.className = 'file-item';
        div.dataset.filename = file.name;

        const link = document.createElement('a');
        link.href = file.url;
        link.download = file.name;
        link.className = 'file-link';
        link.textContent = file.name;

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'delete-file-button';
        deleteBtn.innerHTML = '×';
        deleteBtn.onclick = () => deleteFile('other', index);

        div.appendChild(link);
        div.appendChild(deleteBtn);
        list.appendChild(div);
    });
}

function updateCounter(type) {
    if (type === 'other') return;
    const counter = document.getElementById(`${type}Counter`);
    counter.textContent = `${indices[type] + 1} / ${files[type].length}`;
}

function prevSlide(sliderId, type) {
    if (type === 'other') return;
    const total = files[type].length;
    indices[type] = (indices[type] - 1 + total) % total;
    renderSlider(type);
}

function nextSlide(sliderId, type) {
    if (type === 'other') return;
    const total = files[type].length;
    indices[type] = (indices[type] + 1) % total;
    renderSlider(type);
}

function deleteCurrentFile(type) {
    if (type === 'other') {
        if (files.other.length === 0) {
            alert('Нет файлов для удаления!');
            return;
        }
        files.other.splice(indices.other, 1);
        renderFileList();
        return;
    }

    if (files[type].length === 0) {
        alert('Нет файлов для удаления!');
        return;
    }

    const currentIndex = indices[type];
    const removedFile = files[type].splice(currentIndex, 1)[0];
    URL.revokeObjectURL(removedFile.url);

    if (files[type].length === 0) {
        indices[type] = 0;
        document.getElementById(`${type}Slider`).innerHTML =
            `<p>Добавьте ${type === 'image' ? 'изображения' : 'видео'} для предпросмотра</p>`;
        document.getElementById(`${type}Counter`).textContent = '0 / 0';
        document.getElementById(`${type}Controls`).style.display = 'none';
    } else {
        indices[type] = currentIndex % files[type].length;
        renderSlider(type);
    }
}

function deleteFile(type, index) {
    if (type === 'other') {
        const file = files.other.splice(index, 1)[0];
        URL.revokeObjectURL(file.url);
        renderFileList();
    }
}

async function addFile(type, useExistingInput = false) {
    let input;
    if (useExistingInput) {
        input = document.getElementById(`${type}Input`);
    } else {
        input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = type === 'image' ? 'image/*' :
                      type === 'video' ? 'video/*' : '*';
    }

    input.onchange = async (e) => {
        const newFiles = Array.from(e.target.files).map(file => ({
            name: file.name,
            file,
            url: URL.createObjectURL(file)
        }));

        if (type === 'other') {
            files.other.push(...newFiles);
            renderFileList();
        } else {
            files[type].push(...newFiles);
            renderSlider(type);
            document.getElementById(`${type}Controls`).style.display = 'flex';
        }

        if (!useExistingInput) input.remove();
    };

    if (!useExistingInput) input.click();
}

// Функции для языковых индикаторов
function updateLanguageIndicator(language) {
    const indicator = document.getElementById(`indicator_${language}`);
    const title = document.getElementById(`editTitle${language.toUpperCase()}`)?.value || document.getElementById(`title_${language}`)?.value;
    const content = document.getElementById(`editContent${language.toUpperCase()}`)?.value || document.getElementById(`content_${language}`)?.value;
    indicator.classList.toggle('active-indicator', !!title || !!content);
}

// Функции для редактирования
async function loadBlockData(blockId) {
    const response = await fetch(`/blocks/get/${blockId}`);
    const block = await response.json();

    files.image = block.media.images.map(url => ({ url, file: null }));
    files.video = block.media.videos.map(url => ({ url, file: null }));
    files.other = block.media.others.map(url => ({
        url,
        name: url.split('/').pop(),
        file: null
    }));

    initialMedia = {
        images: [...block.media.images],
        videos: [...block.media.videos],
        others: [...block.media.others]
    };

    ['ru', 'en', 'zh', 'ar'].forEach(lang => {
        document.getElementById(`editTitle${lang.toUpperCase()}`).value = block.title[lang] || '';
        document.getElementById(`editContent${lang.toUpperCase()}`).value = block.content[lang] || '';
        updateLanguageIndicator(lang);
    });

    renderSlider('image');
    renderSlider('video');
    renderFileList();
    document.getElementById('imageControls').style.display = 'flex';
    document.getElementById('videoControls').style.display = 'flex';
}

async function submitEditForm() {
    const title = {}, content = {};
    ['ru', 'en', 'zh', 'ar'].forEach(lang => {
        title[lang] = document.getElementById(`editTitle${lang.toUpperCase()}`).value;
        content[lang] = document.getElementById(`editContent${lang.toUpperCase()}`).value;
    });

    await fetch(`/blocks/update/${currentBlockId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
    });

    const formData = new FormData();
    const deletedImages = initialMedia.images.filter(initialUrl =>
        !files.image.some(file => file.url === initialUrl));
    const deletedVideos = initialMedia.videos.filter(initialUrl =>
        !files.video.some(file => file.url === initialUrl));
    const deletedOthers = initialMedia.others.filter(initialUrl =>
        !files.other.some(file => file.url === initialUrl));

    deletedImages.forEach(url => formData.append('delete_images', url.split('/').pop()));
    deletedVideos.forEach(url => formData.append('delete_videos', url.split('/').pop()));
    deletedOthers.forEach(url => formData.append('delete_others', url.split('/').pop()));

    files.image.forEach(file => { if (file.file) formData.append('images', file.file) });
    files.video.forEach(file => { if (file.file) formData.append('videos', file.file) });
    files.other.forEach(file => { if (file.file) formData.append('others', file.file) });

    await fetch(`/blocks/update_media/${currentBlockId}`, {
        method: 'POST',
        body: formData
    });

    alert('Изменения сохранены!');
    window.location.reload();
}

// Функции для создания новых блоков
async function submitForm() {
    try {
        const formData = new FormData(document.getElementById('mainForm'));

        files.image.forEach(item => formData.append('images', item.file));
        files.video.forEach(item => formData.append('videos', item.file));
        files.other.forEach(item => formData.append('others', item.file));

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

// Вспомогательные функции
function updateFileName(type) {
    const input = document.getElementById(`${type}Input`);
    const fileName = document.getElementById(`${type}FileName`);
    fileName.textContent = input.files.length > 0
        ? `${input.files.length} файлов выбрано: ${Array.from(input.files).map(f => f.name).join(', ')}`
        : 'Не выбран файл';
}

function showLanguageBlock() {
    const selectedLanguage = document.getElementById('languageSelect').value;
    document.querySelectorAll('.language-block').forEach(block => {
        block.classList.remove('active-language');
    });
    if (selectedLanguage) {
        document.getElementById(`block_${selectedLanguage}`).classList.add('active-language');
    }
}

function addLanguage() {
    const selectedLanguage = document.getElementById('languageSelect').value;
    const options = document.getElementById('languageSelect').querySelectorAll('option');
    let nextLanguage = false;

    options.forEach(option => {
        if (nextLanguage && option.value) {
            document.getElementById('languageSelect').value = option.value;
            showLanguageBlock();
            nextLanguage = false;
        }
        if (option.value === selectedLanguage) nextLanguage = true;
    });
}