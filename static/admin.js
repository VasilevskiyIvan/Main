const files = { image: [], video: [], other: [] };
const indices = { image: 0, video: 0, other: 0 };
let currentBlockId = null;
let initialMedia = { images: [], videos: [], others: [] };

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

    if (files[type].length === 0) {
        counter.textContent = '0 / 0';
        indices[type] = 0;
    } else {
        counter.textContent = `${indices[type] + 1} / ${files[type].length}`;
    }
}

function prevSlide(sliderId, type) {
    if (type === 'other' || files[type].length === 0) return;
    const total = files[type].length;
    indices[type] = (indices[type] - 1 + total) % total;
    renderSlider(type);
}

function nextSlide(sliderId, type) {
    if (type === 'other' || files[type].length === 0) return;
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
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/mov', 'video/x-msvideo'];

    let input;
    if (useExistingInput) {
        input = document.getElementById(`${type}Input`);
    } else {
        input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = type === 'image' ? allowedImageTypes.join(', ') :
                      type === 'video' ? allowedVideoTypes.join(', ') : '*';
    }

    input.onchange = async (e) => {
        const filesToAdd = Array.from(e.target.files);
        const validFiles = [];
        const invalidFiles = [];
        for(const file of filesToAdd) {
            let isValid = false;

            if(type === 'image') {
                isValid = allowedImageTypes.includes(file.type);
            }
            else if(type === 'video') {
                isValid = allowedVideoTypes.includes(file.type);
            }
            else {
                isValid = true;
            }

            if(isValid) {
                validFiles.push({
                    name: file.name,
                    file,
                    url: URL.createObjectURL(file)
                });
            } else {
                invalidFiles.push(file.name);
            }
        }
        if(invalidFiles.length > 0) {
            alert(`Следующие файлы не поддерживаются для типа "${type}":\n${invalidFiles.join('\n')}`);
        }
        if(validFiles.length > 0) {
            if(type === 'other') {
                files.other.push(...validFiles);
                renderFileList();
            } else {
                files[type].push(...validFiles);
                renderSlider(type);
                document.getElementById(`${type}Controls`).style.display = 'flex';
            }
        }

        if(!useExistingInput) input.remove();
    };

    if(!useExistingInput) input.click();
}

function updateLanguageIndicator(lang) {
    const indicator = document.getElementById(`indicator_${lang}`);
    const title = document.getElementById(`editTitle${lang.toUpperCase()}`)?.value.trim() ||
                 document.getElementById(`title_${lang}`)?.value.trim();
    const content = document.getElementById(`editContent${lang.toUpperCase()}`)?.value.trim() ||
                   document.getElementById(`content_${lang}`)?.value.trim();

    indicator.classList.remove(
        'danger-indicator',
        'warning-indicator',
        'success-indicator'
    );

    if (!title && !content) {
        indicator.classList.add('danger-indicator');
    } else if (title && content) {
        indicator.classList.add('success-indicator');
    } else {
        indicator.classList.add('warning-indicator');
    }

    indicator.style.animation = (!title && !content) ? 'pulse-red 1.5s infinite' : 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    ['ru', 'en', 'zh', 'ar'].forEach(lang => {
        updateLanguageIndicator(lang);
    });
});

async function loadBlockData(blockId) {
    const response = await fetch(`/blocks/get/${blockId}`);
    const block = await response.json();

    indices.image = 0;
    indices.video = 0;

    files.image = block.media.images.map(url => ({ url, file: null }));
    files.video = block.media.videos.map(url => ({ url, file: null }));
    files.other = block.media.others.map(url => ({
        url,
        name: url.split('/').pop(),
        file: null
    }));

    updateCounter('image');
    updateCounter('video');

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

    document.getElementById('imageControls').style.display =
        files.image.length > 0 ? 'flex' : 'none';
    document.getElementById('videoControls').style.display =
        files.video.length > 0 ? 'flex' : 'none';
}

async function submitEditForm() {
    try {
        const titleRU = document.getElementById('editTitleRU')?.value.trim();
        if (!titleRU) {
            alert('Ошибка: Поле заголовка на русском языке обязательно для заполнения!');
            document.getElementById('editTitleRU').style.border = '2px solid red';
            document.getElementById('editTitleRU').focus();
            return;
        }

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

    } catch (error) {
        console.error('Ошибка сохранения:', error);
        alert('Ошибка при сохранении: ' + error.message);
    }
}

async function submitForm() {
    try {
        const titleRU = document.getElementById('title_ru')?.value.trim() ||
                      document.getElementById('editTitleRU')?.value.trim();

        if (!titleRU) {
            alert('Ошибка: Поле заголовка на русском языке обязательно для заполнения!');
            return;
        }
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