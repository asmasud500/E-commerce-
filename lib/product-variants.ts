export type ProductVariant = {
  id?: string;
  sku?: string;
  options: Record<string,string>;
  price: number;
  salePrice?: number | null;
  compareAtPrice?: number | null;
  stock: number;
  lowStockThreshold?: number;
};

export function variantKey(options: Record<string,string> = {}) {
  return Object.entries(options).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+"="+v).join("|");
}

export function generateVariantCombinations(options: {name:string;values:string[]}[]): Record<string,string>[] {
  if (!Array.isArray(options) || !options.length) return [];
  return options.reduce<Record<string,string>[]>((rows, option) => {
    const name=String(option.name||"").trim();
    const values=[...new Set((option.values||[]).map(v=>String(v).trim()).filter(Boolean))];
    if(!name||!values.length)return rows;
    const base=rows.length?rows:[{}];
    return base.flatMap(row=>values.map(value=>({...row,[name]:value})));
  },[]).slice(0,200);
}

export function resolveProductVariant(variants: unknown, selection?: Record<string,string>) {
  if(!Array.isArray(variants)||!variants.length)return null;
  const wanted=variantKey(selection||{});
  return (variants as ProductVariant[]).find(v=>variantKey(v.options||{})===wanted)||null;
}

export function normalizeVariants(input: unknown) {
  if(!Array.isArray(input))return [];
  return input.slice(0,200).map((v:any)=>({
    id:typeof v.id==="string"&&v.id?v.id:variantKey(v.options||{}),
    sku:typeof v.sku==="string"?v.sku.slice(0,100):"",
    options:Object.fromEntries(Object.entries(v.options||{}).map(([k,val])=>[String(k).slice(0,40),String(val).slice(0,40)])),
    price:Number(v.price),
    salePrice:v.salePrice==null||v.salePrice===""?null:Number(v.salePrice),
    compareAtPrice:v.compareAtPrice==null||v.compareAtPrice===""?null:Number(v.compareAtPrice),
    stock:Number(v.stock),
    lowStockThreshold:Number.isFinite(Number(v.lowStockThreshold))?Number(v.lowStockThreshold):5
  }));
}
