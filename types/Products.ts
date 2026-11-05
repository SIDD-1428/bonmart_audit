export type Product ={
    id: string;
    name: string;
    price: number;
    image: string;
    category: string;
    protext: string;
    unit: string;
    description?: string;
    rating?: number;
    stock?: number;
    maxOrderQty?: number;
}