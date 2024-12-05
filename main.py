from fastapi import FastAPI, Form, UploadFile, File, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os
import json
from typing import List
from uuid import uuid4

# Инициализация приложения
app = FastAPI()

# Настройка статических файлов и шаблонов
# Настройка статических файлов и шаблонов
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

templates = Jinja2Templates(directory="templates")

# Файлы для хранения данных
BLOCKS_FILE = "blocks.json"
IMAGE_DIR = "uploads/images"
VIDEO_DIR = "uploads/videos"

# Создание необходимых директорий
os.makedirs(IMAGE_DIR, exist_ok=True)
os.makedirs(VIDEO_DIR, exist_ok=True)

# Чтение блоков из файла
def read_blocks():
    if not os.path.exists(BLOCKS_FILE):
        return []
    with open(BLOCKS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

# Сохранение блоков в файл
def save_blocks(blocks):
    with open(BLOCKS_FILE, "w", encoding="utf-8") as f:
        json.dump(blocks, f, ensure_ascii=False, indent=4)

# Главная страница со списком блоков
@app.get("/", response_class=HTMLResponse)
async def serve_home(request: Request):
    blocks = read_blocks()
    return templates.TemplateResponse("index.html", {"request": request, "blocks": blocks})

# Страница добавления нового блока
@app.get("/blocks/new", response_class=HTMLResponse)
async def create_block_page(request: Request):
    return templates.TemplateResponse("add_block.html", {"request": request})

# Обработка добавления нового блока
@app.post("/blocks/new")
async def create_block(
    title: str = Form(...),
    content: str = Form(...),
    images: List[UploadFile] = File([]),
    videos: List[UploadFile] = File([]),
):
    blocks = read_blocks()

    # Сохранение загруженных изображений
    image_paths = []
    for index, image in enumerate(images):
        if image.filename:
            extension = os.path.splitext(image.filename)[1]
            safe_filename = f"{title}_{index + 1}{extension}".replace(" ", "_")
            local_path = os.path.join(IMAGE_DIR, safe_filename)
            url_path = f"uploads/images/{safe_filename}"
            with open(local_path, "wb") as f:
                f.write(await image.read())
            image_paths.append(url_path)

    # Сохранение загруженных видео
    video_paths = []
    for index, video in enumerate(videos):
        if video.filename:
            extension = os.path.splitext(video.filename)[1]
            safe_filename = f"{title}_{index + 1}{extension}".replace(" ", "_")
            local_path = os.path.join(VIDEO_DIR, safe_filename)
            url_path = f"uploads/videos/{safe_filename}"
            with open(local_path, "wb") as f:
                f.write(await video.read())
            video_paths.append(url_path)

    # Добавление нового блока
    block = {
        "title": title,
        "content": content,
        "images": image_paths or None,
        "videos": video_paths or None,
    }
    blocks.append(block)
    save_blocks(blocks)

    return {"message": "Блок успешно добавлен!"}


# Страница выбора блока для редактирования
@app.get("/blocks/manage", response_class=HTMLResponse)
async def manage_blocks(request: Request):
    blocks = read_blocks()
    return templates.TemplateResponse("manage_blocks.html", {"request": request, "blocks": blocks})


# Страница редактирования существующего блока
@app.get("/blocks/edit", response_class=HTMLResponse)
async def edit_block_page(request: Request, title: str):
    blocks = read_blocks()
    block = next((b for b in blocks if b["title"] == title), None)
    if block is None:
        raise HTTPException(status_code=404, detail="Block not found")
    return templates.TemplateResponse("edit_block.html", {"request": request, "block": block, "block_title": title})

# Обработка сохранения изменений блока
@app.post("/blocks/edit")
async def edit_block(
    old_title: str = Form(...),
    title: str = Form(...),
    content: str = Form(...),
    images: List[UploadFile] = File([]),
    videos: List[UploadFile] = File([]),
):
    blocks = read_blocks()

    # Найти блок по старому названию
    block = next((b for b in blocks if b["title"] == old_title), None)
    if block is None:
        raise HTTPException(status_code=404, detail="Block not found")

    # Проверить уникальность нового названия
    if title != old_title and any(b["title"] == title for b in blocks):
        raise HTTPException(status_code=400, detail="Block with this title already exists")

    # Сохранение новых изображений
    image_paths = block["images"] or []
    for index, image in enumerate(images):
        if image.filename:
            extension = os.path.splitext(image.filename)[1]
            safe_filename = f"{title}_{len(image_paths) + index + 1}{extension}".replace(" ", "_")
            local_path = os.path.join(IMAGE_DIR, safe_filename)
            url_path = f"uploads/images/{safe_filename}"
            with open(local_path, "wb") as f:
                f.write(await image.read())
            image_paths.append(url_path)

    # Сохранение новых видео
    video_paths = block["videos"] or []
    for index, video in enumerate(videos):
        if video.filename:
            extension = os.path.splitext(video.filename)[1]
            safe_filename = f"{title}_{len(video_paths) + index + 1}{extension}".replace(" ", "_")
            local_path = os.path.join(VIDEO_DIR, safe_filename)
            url_path = f"uploads/videos/{safe_filename}"
            with open(local_path, "wb") as f:
                f.write(await video.read())
            video_paths.append(url_path)

    # Обновление данных блока
    block.update({
        "title": title,
        "content": content,
        "images": image_paths,
        "videos": video_paths,
    })
    save_blocks(blocks)

    return RedirectResponse(url="/", status_code=303)



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
