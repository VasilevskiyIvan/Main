from fastapi import FastAPI, Form, UploadFile, File, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os
import json
from typing import List
from uuid import uuid4

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

templates = Jinja2Templates(directory="templates")


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

    templates.env.filters["get_filename"] = lambda url: url.split('/')[-1]


register_filters()

BLOCKS_FILE = "blocks.json"
USERS_FILE = "users.json"
IMAGE_DIR = "uploads/images"
VIDEO_DIR = "uploads/videos"
OTHER_DIR = "uploads/others"

os.makedirs(IMAGE_DIR, exist_ok=True)
os.makedirs(VIDEO_DIR, exist_ok=True)
os.makedirs(OTHER_DIR, exist_ok=True)


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


@app.get("/", response_class=HTMLResponse)
async def serve_home(request: Request):
    blocks = read_blocks()
    return templates.TemplateResponse("index.html", {"request": request, "blocks": blocks})


@app.get("/broadcast", response_class=HTMLResponse)
async def broadcast_page(request: Request):
    users = read_users()
    return templates.TemplateResponse("broadcast.html", {
        "request": request,
        "users": users,
        "initialMedia": {"others": []}
    })


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
        others: List[UploadFile] = File([]),
        user_id: str = Form(...)
):
    media_paths = {
        "images": await save_media(images, IMAGE_DIR),
        "videos": await save_media(videos, VIDEO_DIR),
        "others": await save_media(others, OTHER_DIR)
    }

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

    return RedirectResponse(url="/broadcast", status_code=303)


async def save_media(files: List[UploadFile], directory: str) -> List[str]:
    paths = []
    for file in files:
        if file.filename:
            ext = os.path.splitext(file.filename)[1]
            filename = f"{uuid4()}{ext}"
            filepath = os.path.join(directory, filename)

            with open(filepath, "wb") as f:
                f.write(await file.read())

            paths.append(f"/uploads/{os.path.relpath(filepath, 'uploads/')}")
    return paths


@app.get("/blocks/new", response_class=HTMLResponse)
async def create_block_page(request: Request):
    return templates.TemplateResponse("add_block.html", {
        "request": request,
        "initialMedia": {"others": []}
    })


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
        others: List[UploadFile] = File([]),
):
    blocks = read_blocks()

    media_paths = {
        "images": await save_media(images, IMAGE_DIR),
        "videos": await save_media(videos, VIDEO_DIR),
        "others": await save_media(others, OTHER_DIR)
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


@app.get("/blocks/select", response_class=HTMLResponse)
async def select_block_page(request: Request):
    blocks = read_blocks()
    return templates.TemplateResponse("edit_block.html", {
        "request": request,
        "blocks": blocks,
        "initialMedia": {"others": []}
    })


@app.get("/blocks/get/{block_id}")
async def get_block(block_id: int):
    blocks = read_blocks()
    if block_id < len(blocks):
        return blocks[block_id]
    raise HTTPException(status_code=404, detail="Block not found")


@app.post("/blocks/update/{block_id}")
async def update_block(
        block_id: int,
        title: dict = None,
        content: dict = None
):
    blocks = read_blocks()
    if block_id >= len(blocks):
        raise HTTPException(status_code=404, detail="Block not found")

    if title:
        blocks[block_id]["title"] = title
    if content:
        blocks[block_id]["content"] = content

    save_blocks(blocks)
    return {"status": "success"}


@app.post("/blocks/update_media/{block_id}")
async def update_media(
        block_id: int,
        delete_images: List[str] = Form([]),
        delete_videos: List[str] = Form([]),
        delete_others: List[str] = Form([]),
        images: List[UploadFile] = File([]),
        videos: List[UploadFile] = File([]),
        others: List[UploadFile] = File([]),
):
    blocks = read_blocks()
    if block_id >= len(blocks):
        raise HTTPException(status_code=404, detail="Block not found")

    # Delete old files
    for filename in delete_images:
        filepath = os.path.join(IMAGE_DIR, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
        blocks[block_id]["media"]["images"] = [
            url for url in blocks[block_id]["media"]["images"]
            if not url.endswith(filename)
        ]

    for filename in delete_videos:
        filepath = os.path.join(VIDEO_DIR, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
        blocks[block_id]["media"]["videos"] = [
            url for url in blocks[block_id]["media"]["videos"]
            if not url.endswith(filename)
        ]

    for filename in delete_others:
        filepath = os.path.join(OTHER_DIR, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
        blocks[block_id]["media"]["others"] = [
            url for url in blocks[block_id]["media"]["others"]
            if not url.endswith(filename)
        ]

    new_images = await save_media(images, IMAGE_DIR)
    new_videos = await save_media(videos, VIDEO_DIR)
    new_others = await save_media(others, OTHER_DIR)

    blocks[block_id]["media"]["images"].extend(new_images)
    blocks[block_id]["media"]["videos"].extend(new_videos)
    blocks[block_id]["media"]["others"].extend(new_others)

    save_blocks(blocks)
    return {"status": "success"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)