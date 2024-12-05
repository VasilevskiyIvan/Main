from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi import Request
import os
import json

router = APIRouter()
templates = Jinja2Templates(directory="templates")

# Путь для хранения блоков
BLOCKS_FILE = "blocks_data.txt"


# Функция для чтения блоков из файла
def read_blocks_from_file():
    if os.path.exists(BLOCKS_FILE):
        with open(BLOCKS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


# Функция для записи блоков в файл
def write_blocks_to_file(blocks):
    with open(BLOCKS_FILE, "w", encoding="utf-8") as f:
        json.dump(blocks, f, ensure_ascii=False, indent=4)


# Создание нового блока
@router.post("/blocks")
async def create_block_endpoint(block_data: dict):
    blocks = read_blocks_from_file()
    block_id = len(blocks) + 1
    block_data["id"] = block_id
    blocks.append(block_data)
    write_blocks_to_file(blocks)
    return {"message": "Block created successfully", "block": block_data}


# Получение блока по ID
@router.get("/blocks/id/{block_id}")
async def get_block_endpoint(block_id: int):
    blocks = read_blocks_from_file()
    block = next((block for block in blocks if block["id"] == block_id), None)
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    return block


# Удаление блока
@router.delete("/blocks/id/{block_id}")
async def delete_block_endpoint(block_id: int):
    blocks = read_blocks_from_file()
    updated_blocks = [block for block in blocks if block["id"] != block_id]
    if len(updated_blocks) == len(blocks):
        raise HTTPException(status_code=404, detail="Block not found")
    write_blocks_to_file(updated_blocks)
    return {"message": "Block deleted successfully"}


# Обновление блока
@router.patch("/blocks/id/{block_id}")
async def update_block_endpoint(block_id: int, block_data: dict):
    blocks = read_blocks_from_file()
    block = next((block for block in blocks if block["id"] == block_id), None)
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    block.update(block_data)
    write_blocks_to_file(blocks)
    return {"message": "Block updated successfully", "block": block}


# Получение всех блоков
@router.get("/blocks")
async def get_all_blocks():
    blocks = read_blocks_from_file()
    return blocks


# Страницы для создания и редактирования блоков
@router.get("/blocks/new", response_class=HTMLResponse)
async def create_block_page(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@router.get("/blocks/edit", response_class=HTMLResponse)
async def edit_block_page(request: Request):
    return templates.TemplateResponse("edit_block.html", {"request": request})
