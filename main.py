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

app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

templates = Jinja2Templates(directory="templates")

# Регистрация пользовательских фильтров для Jinja2
def register_filters():
    templates.env.filters["language_label"] = lambda code: {
        "ru": "Русский",
        "en": "English",
        "zh": "中文",
        "ar": "العربية"
    }.get(code, "")

    templates.env.filters["title_label"] = lambda code: {
        "ru": "Название",
        "en": "Title",
        "zh": "标题",
        "ar": "العنوان"
    }.get(code, "")

    templates.env.filters["content_label"] = lambda code: {
        "ru": "Содержание",
        "en": "Content",
        "zh": "内容",
        "ar": "المحتوى"
    }.get(code, "")

register_filters()

# Файлы для хранения данных
BLOCKS_FILE = "blocks.json"
USERS_FILE = "users.json"
IMAGE_DIR = "uploads/images"
VIDEO_DIR = "uploads/videos"

# Создание необходимых директорий
os.makedirs(IMAGE_DIR, exist_ok=True)
os.makedirs(VIDEO_DIR, exist_ok=True)

def read_blocks():
    if not os.path.exists(BLOCKS_FILE):
        return []
    with open(BLOCKS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_blocks(blocks):
    with open(BLOCKS_FILE, "w", encoding="utf-8") as f:
        json.dump(blocks, f, ensure_ascii=False, indent=4)

def read_users():
    if not os.path.exists(USERS_FILE):
        return []
    with open(USERS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

# Главная страница
@app.get("/", response_class=HTMLResponse)
async def serve_home(request: Request):
    blocks = read_blocks()
    return templates.TemplateResponse("index.html", {"request": request, "blocks": blocks})

# Страница рассылки
@app.get("/broadcast", response_class=HTMLResponse)
async def broadcast_page(request: Request):
    users = read_users()
    return templates.TemplateResponse("broadcast.html", {
        "request": request,
        "users": users
    })

# Обработчик рассылки
@app.post("/send")
async def send_broadcast(
    request: Request,
    title_ru: str = Form(None),
    content_ru: str = Form(None),
    title_en: str = Form(None),
    content_en: str = Form(None),
    title_zh: str = Form(None),
    content_zh: str = Form(None),
    title_ar: str = Form(None),
    content_ar: str = Form(None),
    images: List[UploadFile] = File([]),
    videos: List[UploadFile] = File([]),
    user_id: str = Form(...)
):
    # Сохранение медиа файлов
    media_paths = {
        "images": await save_media(images, IMAGE_DIR),
        "videos": await save_media(videos, VIDEO_DIR)
    }

    # Формирование контента
    content = {
        "title": {
            "ru": title_ru,
            "en": title_en,
            "zh": title_zh,
            "ar": title_ar
        },
        "content": {
            "ru": content_ru,
            "en": content_en,
            "zh": content_zh,
            "ar": content_ar
        },
        "media": media_paths,
        "user_id": user_id
    }

    # Здесь должна быть логика отправки сообщения пользователю
    # Например, через Telegram Bot API

    return RedirectResponse(url="/broadcast", status_code=303)

async def save_media(files: List[UploadFile], directory: str) -> List[str]:
    paths = []
    for file in files:
        if file.filename:
            ext = os.path.splitext(file.filename)[1]
            filename = f"{uuid4()}{ext}"
            path = os.path.join(directory, filename)
            with open(path, "wb") as f:
                f.write(await file.read())
            paths.append(f"/uploads/{os.path.relpath(path, 'uploads/')}")
    return paths

@app.get("/blocks/new", response_class=HTMLResponse)
async def create_block_page(request: Request):
    return templates.TemplateResponse("add_block.html", {"request": request})

@app.post("/blocks/new")
async def create_block(
    title_ru: str = Form(None),
    content_ru: str = Form(None),
    title_en: str = Form(None),
    content_en: str = Form(None),
    title_zh: str = Form(None),
    content_zh: str = Form(None),
    title_ar: str = Form(None),
    content_ar: str = Form(None),
    images: List[UploadFile] = File([]),
    videos: List[UploadFile] = File([]),
):
    blocks = read_blocks()

    media_paths = {
        "images": await save_media(images, IMAGE_DIR),
        "videos": await save_media(videos, VIDEO_DIR)
    }

    new_block = {
        "title": {
            "ru": title_ru,
            "en": title_en,
            "zh": title_zh,
            "ar": title_ar
        },
        "content": {
            "ru": content_ru,
            "en": content_en,
            "zh": content_zh,
            "ar": content_ar
        },
        "media": media_paths
    }

    blocks.append(new_block)
    save_blocks(blocks)

    return RedirectResponse(url="/", status_code=303)

# Страница выбора блока для редактирования
@app.get("/blocks/select", response_class=HTMLResponse)
async def select_block_page(request: Request):
    blocks = read_blocks()
    return templates.TemplateResponse("edit_block.html", {"request": request, "blocks": blocks})

@app.post("/blocks/update/{block_id}")
async def update_block(block_id: int, updated_data: dict):
    blocks = read_blocks()
    if block_id < len(blocks):
        # Обновляем title и content
        if 'title' in updated_data:
            blocks[block_id]['title'] = updated_data['title']
        if 'content' in updated_data:
            blocks[block_id]['content'] = updated_data['content']
        save_blocks(blocks)
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Block not found")

# Для удаления изображений
@app.post("/blocks/delete_image/{block_id}")
async def delete_image(block_id: int):
    blocks = read_blocks()
    if block_id < len(blocks) and blocks[block_id]['media']['images']:
        image_path = blocks[block_id]['media']['images'].pop()
        if os.path.exists(image_path.replace("uploads/", "")):
            os.remove(image_path.replace("uploads/", ""))
        save_blocks(blocks)
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="No image to delete")

# Для удаления видео
@app.post("/blocks/delete_video/{block_id}")
async def delete_video(block_id: int):
    blocks = read_blocks()
    if block_id < len(blocks) and blocks[block_id]['media']['videos']:
        video_path = blocks[block_id]['media']['videos'].pop()
        if os.path.exists(video_path.replace("uploads/", "")):
            os.remove(video_path.replace("uploads/", ""))
        save_blocks(blocks)
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="No video to delete")

# Для добавления изображений
@app.post("/blocks/add_images/{block_id}")
async def add_images(block_id: int, images: List[UploadFile] = File(...)):
    blocks = read_blocks()
    if block_id < len(blocks):
        image_paths = []
        for image in images:
            if image.filename:
                extension = os.path.splitext(image.filename)[1]
                safe_filename = f"{uuid4()}{extension}"
                local_path = os.path.join(IMAGE_DIR, safe_filename)
                url_path = f"/uploads/images/{safe_filename}"
                with open(local_path, "wb") as f:
                    f.write(await image.read())
                image_paths.append(url_path)

        if not blocks[block_id]['media']['images']:
            blocks[block_id]['media']['images'] = []
        blocks[block_id]['media']['images'].extend(image_paths)
        save_blocks(blocks)
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Block not found")

# Для добавления видео
@app.post("/blocks/add_videos/{block_id}")
async def add_videos(block_id: int, videos: List[UploadFile] = File(...)):
    blocks = read_blocks()
    if block_id < len(blocks):
        video_paths = []
        for video in videos:
            if video.filename:
                extension = os.path.splitext(video.filename)[1]
                safe_filename = f"{uuid4()}{extension}"
                local_path = os.path.join(VIDEO_DIR, safe_filename)
                url_path = f"/uploads/videos/{safe_filename}"
                with open(local_path, "wb") as f:
                    f.write(await video.read())
                video_paths.append(url_path)

        if not blocks[block_id]['media']['videos']:
            blocks[block_id]['media']['videos'] = []
        blocks[block_id]['media']['videos'].extend(video_paths)
        save_blocks(blocks)
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Block not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
