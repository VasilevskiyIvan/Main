from pydantic import BaseModel
from fastapi import HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db_model.model import Block
from db_model.database import get_db
from typing import Optional


# Схема для создания блока
class BlockCreate(BaseModel):
    title_ru: str
    title_en: Optional[str] = None
    title_ar: Optional[str] = None
    full_description_ru: Optional[str] = None
    full_description_en: Optional[str] = None
    full_description_ar: Optional[str] = None
    parent_id: Optional[int] = None


# Схема для обновления блока (все поля необязательны)
class BlockUpdate(BaseModel):
    title_ru: Optional[str] = None
    title_en: Optional[str] = None
    title_ar: Optional[str] = None
    full_description_ru: Optional[str] = None
    full_description_en: Optional[str] = None
    full_description_ar: Optional[str] = None


# Создание блока
async def create_block(block_data: BlockCreate, db: AsyncSession = Depends(get_db)):
    print(f"Creating block with data: {block_data}")  # Логируем данные перед созданием
    new_block = Block(
        title_ru=block_data.title_ru,
        title_en=block_data.title_en,
        title_ar=block_data.title_ar,
        full_description_ru=block_data.full_description_ru,
        full_description_en=block_data.full_description_en,
        full_description_ar=block_data.full_description_ar,
        parent_id=block_data.parent_id,
        children_ids=[]
    )
    db.add(new_block)
    await db.commit()
    await db.refresh(new_block)

    if new_block.parent_id:
        parent_block = await db.get(Block, new_block.parent_id)
        if parent_block:
            parent_block.children_ids.append(new_block.id)
            await db.commit()
            print(f"Added new block ID {new_block.id} to parent {parent_block.id}")

    print(f"Block created with ID: {new_block.id}")
    return new_block


# Обновление блока
async def update_block(
    block_id: int,
    block_data: BlockUpdate,
    db: AsyncSession = Depends(get_db)
):
    block = await db.get(Block, block_id)
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    # Обновляем поля блока, если они переданы
    update_data = block_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(block, key, value)

    await db.commit()
    return block


# Получение блока по ID
async def get_block(block_id: int, db: AsyncSession = Depends(get_db)):
    block = await db.get(Block, block_id)
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    return block


# Удаление блока и всех его детей рекурсивно
async def delete_block(block_id: int, db: AsyncSession = Depends(get_db)):
    block = await db.get(Block, block_id)
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    # Удаляем все дочерние блоки рекурсивно
    await delete_children_recursively(block.id, db)

    # Если у блока есть родитель, удаляем его ID из списка детей родителя
    if block.parent_id:
        parent_block = await db.get(Block, block.parent_id)
        if parent_block.children_ids:
            if parent_block and block.id in parent_block.children_ids:
                parent_block.children_ids.remove(block.id)
                await db.commit()

    # Удаляем сам блок
    await db.delete(block)
    await db.commit()
    return {"detail": "Block and its children deleted"}


# Вспомогательная функция для удаления всех дочерних блоков рекурсивно
async def delete_children_recursively(block_id: int, db: AsyncSession):
    # Находим все дочерние блоки
    query = select(Block).where(Block.parent_id == block_id)
    result = await db.execute(query)
    children_blocks = result.scalars().all()

    # Удаляем каждый дочерний блок
    for child in children_blocks:
        await delete_children_recursively(child.id, db)  # Рекурсивно удаляем детей
        await db.delete(child)  # Удаляем сам дочерний блок
    await db.commit()


# Получение всех блоков рекурсивно
async def get_blocks_recursively(db: AsyncSession = Depends(get_db), parent_id: Optional[int] = None):
    print(f"Fetching blocks with parent_id={parent_id}")
    blocks_query = select(Block).where(Block.parent_id == parent_id)
    result = await db.execute(blocks_query)
    blocks = result.scalars().all()

    fetched_blocks = []
    for block in blocks:
        print(f"Found block: {block}")
        # Собираем детей рекурсивно и создаем новую структуру данных
        child_blocks = await get_blocks_recursively(db=db, parent_id=block.id)
        block_data = {
            "id": block.id,
            "title_ru": block.title_ru,
            "title_en": block.title_en,
            "title_ar": block.title_ar,
            "full_description_ru": block.full_description_ru,
            "full_description_en": block.full_description_en,
            "full_description_ar": block.full_description_ar,
            "children": child_blocks
        }
        fetched_blocks.append(block_data)

    return fetched_blocks