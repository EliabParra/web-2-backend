/**
 * Definiciones de tipos para Inventory
 * Entidad:
 * inventory_id: identificador
 * inventory_qt: cantidad
 * inventory_updated_dt: fecha de actualización
 * location_id: ubicación
 * item_id: item asociado
 */

export namespace Inventory {
    // ============================================================
    // Tipos de Entidad
    // ============================================================

    export type Entity = {
        inventory_id: number
        inventory_qt: number
        inventory_updated_dt: string | Date
        location_id: number
        item_id: number

        // Datos enriquecidos para reglas y vistas
        category_type_id?: number
        item_cod?: number
        item_na?: string
        location_de?: string
        location_sh?: number
        location_dr?: number
    }

    export type Summary = {
        inventory_id: number
        inventory_qt: number
        inventory_updated_dt: string | Date
        location_id: number
        item_id: number
        category_type_id?: number
        item_cod?: number
        item_na?: string
        location_de?: string
        location_sh?: number
        location_dr?: number
    }

    // ============================================================
    // Tipos de Entrada
    // ============================================================

    export interface CreateInput {
        item_id: number
        location_id: number
        inventory_qt: number
    }

    export interface UpdateInput {
        inventory_id: number
        inventory_qt?: number
        location_id?: number
    }

    export interface GetInput {
        inventory_id: number
    }

    export interface GetAllInput {
        item_id?: number
        location_id?: number
        category_type_id?: number
    }

    export interface DeleteInput {
        inventory_id: number
    }

    export interface AddStockInput {
        inventory_id: number
        quantity: number
    }

    export interface RemoveStockInput {
        inventory_id: number
        quantity: number
    }

    export interface MoveLocationInput {
        inventory_id: number
        location_id: number
    }

    export type RowCount = {
        rowCount: number
    }

    export type Exists = {
        exists: boolean
    }

    // ============================================================
    // Contratos (Service/Repository)
    // ============================================================

    export interface Repository {
        findAll(filters?: GetAllInput): Promise<Summary[]>
        findById(id: number): Promise<Entity | null>
        findByItemAndLocation(itemId: number, locationId: number): Promise<Entity | null>
        findActiveByItem(itemId: number): Promise<Entity | null>
        getItemCategoryType(itemId: number): Promise<number | null>
        create(data: Partial<Entity>): Promise<Entity | null>
        update(id: number, data: Partial<Entity>): Promise<Entity | null>
        delete(id: number): Promise<Entity>
        exists(id: number): Promise<boolean>
    }

    export interface Service {
        getAll(filters?: GetAllInput): Promise<Summary[]>
        getById(id: number): Promise<Entity>
        create(data: Partial<Entity>): Promise<Entity | null>
        update(id: number, data: Partial<Entity>): Promise<Entity>
        addStock(id: number, quantity: number): Promise<Entity>
        removeStock(id: number, quantity: number): Promise<Entity>
        moveLocation(id: number, locationId: number): Promise<Entity>
        delete(id: number): Promise<Entity>
    }
}

export type Inventory = Inventory.Entity
export type InventorySummary = Inventory.Summary
export type CreateInventoryInput = Inventory.CreateInput
export type UpdateInventoryInput = Inventory.UpdateInput
export type GetInventoryInput = Inventory.GetInput
export type GetAllInventoryInput = Inventory.GetAllInput
export type DeleteInventoryInput = Inventory.DeleteInput
export type AddStockInventoryInput = Inventory.AddStockInput
export type RemoveStockInventoryInput = Inventory.RemoveStockInput
export type MoveLocationInventoryInput = Inventory.MoveLocationInput

export type RowCountInventory = Inventory.RowCount
export type ExistsInventory = Inventory.Exists
export type IInventoryRepository = Inventory.Repository
export type IInventoryService = Inventory.Service
