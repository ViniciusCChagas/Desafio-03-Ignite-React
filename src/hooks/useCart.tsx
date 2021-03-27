import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
	children: ReactNode;
}

interface UpdateProductAmount {
	productId: number;
	amount: number;
}

interface CartContextData {
	cart: Product[];
	addProduct: (productId: number) => Promise<void>;
	removeProduct: (productId: number) => void;
	updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
	const [cart, setCart] = useState<Product[]>(() => {
		const storagedCart = localStorage.getItem('@RocketShoes:cart');

		if (storagedCart) {
			return JSON.parse(storagedCart);
		}

		return [];
	});

	const addProduct = async (productId: number) => {
		try {
			const newCart = [...cart];
			const stockResponse = await api.get(`stock/${productId}`);

			if (stockResponse.status !== 200) {
				throw Error();
			}
			const itemStock = stockResponse.data;
			const cartItemIndex = cart.findIndex((product) => product.id === productId);

			if (cartItemIndex >= 0) {
				const newItem = newCart[cartItemIndex];
				if (itemStock.amount >= newItem.amount + 1) {
					newItem.amount++;
				} else {
					toast.error('Quantidade solicitada fora de estoque');
					return;
				}
			} else {
				if (itemStock.amount >= 1) {
					const productResponse = await api.get(`products/${productId}`);
					if (productResponse.status !== 200) {
						throw Error();
					}
					const product = productResponse.data;

					newCart.push({
						...product,
						amount: 1,
					});
				} else {
					toast.error('Quantidade solicitada fora de estoque');
					return;
				}
			}

			setCart(newCart);
			localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
		} catch {
			toast.error('Erro na adição do produto');
			return;
		}
	};

	const removeProduct = (productId: number) => {
		try {
			const newCart = [...cart];
			const productIndex = newCart.findIndex((product) => product.id === productId);

			if (productIndex >= 0) {
				newCart.splice(productIndex, 1);
				setCart(newCart);
				localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
			} else {
				throw Error();
			}
		} catch {
			toast.error('Erro na remoção do produto');
		}
	};

	const updateProductAmount = async ({ productId, amount }: UpdateProductAmount) => {
		try {
			if (amount < 1) {
				throw new Error();
			}

			const stockResponse = await api.get(`/stock/${productId}`);
			const itemStock = stockResponse.data as Stock;

			const newCart = [...cart];

			const cartItem = newCart.find((product) => product.id === productId);

			if (!itemStock || !cartItem) {
				throw new Error();
			}

			if (itemStock.amount >= amount) {
				cartItem.amount = amount;
			} else {
				toast.error('Quantidade solicitada fora de estoque');
				return;
			}

			setCart(newCart);
			localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
		} catch {
			toast.error('Erro na alteração de quantidade do produto');
		}
	};

	return (
		<CartContext.Provider
			value={{ cart, addProduct, removeProduct, updateProductAmount }}
		>
			{children}
		</CartContext.Provider>
	);
}

export function useCart(): CartContextData {
	const context = useContext(CartContext);

	return context;
}
