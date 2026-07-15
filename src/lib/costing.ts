import type { InventoryItem } from '../types';

type CostableInventoryItem = Pick<InventoryItem, 'unit' | 'unitCost' | 'unitsPerPackage' | 'quantity' | 'totalMeasure' | 'subUnitName' | 'consumptionUnit'>;

export function inventoryConsumptionScale(item?: CostableInventoryItem | null) {
  if (!item) return 1;
  if (item.unit === 'pacote' && item.unitsPerPackage && item.unitsPerPackage > 1) {
    return item.unitsPerPackage;
  }
  if (item.unit === 'peso' && item.totalMeasure && item.totalMeasure > 1) {
    return item.totalMeasure;
  }
  return 1;
}

export function inventoryConsumptionUnitCost(item?: CostableInventoryItem | null) {
  if (!item) return 0;
  return (Number(item.unitCost || 0) / inventoryConsumptionScale(item));
}

export function inventoryConsumptionStockDelta(item: CostableInventoryItem, consumedQuantity: number) {
  return Number(consumedQuantity || 0) / inventoryConsumptionScale(item);
}

export function inventoryStockValue(item: CostableInventoryItem) {
  return Number(item.quantity || 0) * Number(item.unitCost || 0);
}

export function inventoryConsumptionUnitLabel(item?: CostableInventoryItem | null) {
  if (!item) return 'un';
  if (item.consumptionUnit) return item.consumptionUnit;
  if (item.unit === 'pacote') return item.subUnitName || 'un';
  if (item.unit === 'peso') return 'g/ml';
  return item.unit || 'un';
}

export function suggestedServicePrice(totalCost: number, targetMarginPercent = 60) {
  const normalizedMargin = Math.min(95, Math.max(1, Number(targetMarginPercent || 60)));
  return totalCost / (1 - normalizedMargin / 100);
}
