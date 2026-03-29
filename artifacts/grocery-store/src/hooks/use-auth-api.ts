import { useStore } from '@/store';
import { 
  useGetProducts, useGetProduct, useGetCategories,
  useSignup, useLogin, useLogout, useGetMe, useUpdateLocation,
  useAdminLogin, useCreateCategory, useUpdateCategory, useDeleteCategory,
  useCreateProduct, useUpdateProduct, useDeleteProduct,
  useGetOrders, useCreateOrder, useGetOrder,
  useAdminGetOrders, useUpdateOrderStatus, useAssignDelivery,
  useGetDeliveryPersons, useCreateDeliveryPerson, useUpdateDeliveryPerson, useDeleteDeliveryPerson,
  useGetAdminStats, useUploadImage
} from '@workspace/api-client-react';

// Wrapper to inject auth headers from Zustand
function useAuthOptions() {
  const token = useStore(state => state.token);
  return {
    request: {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }
  };
}

export function useAppProducts(params?: any) { return useGetProducts(params, useAuthOptions()); }
export function useAppProduct(id: number) { return useGetProduct(id, useAuthOptions()); }
export function useAppCategories() { return useGetCategories(useAuthOptions()); }

export function useAppSignup() { return useSignup({ ...useAuthOptions() }); }
export function useAppLogin() { return useLogin({ ...useAuthOptions() }); }
export function useAppLogout() { return useLogout({ ...useAuthOptions() }); }
export function useAppMe() { return useGetMe({ ...useAuthOptions(), query: { retry: false } }); }
export function useAppUpdateLocation() { return useUpdateLocation({ ...useAuthOptions() }); }

export function useAppAdminLogin() { return useAdminLogin({ ...useAuthOptions() }); }
export function useAppOrders() { return useGetOrders({ ...useAuthOptions() }); }
export function useAppOrder(id: number) { return useGetOrder(id, { ...useAuthOptions() }); }
export function useAppCreateOrder() { return useCreateOrder({ ...useAuthOptions() }); }

export function useAppAdminOrders(params?: any) { return useAdminGetOrders(params, useAuthOptions()); }
export function useAppUpdateOrderStatus() { return useUpdateOrderStatus({ ...useAuthOptions() }); }
export function useAppAssignDelivery() { return useAssignDelivery({ ...useAuthOptions() }); }

export function useAppDeliveryPersons() { return useGetDeliveryPersons(useAuthOptions()); }
export function useAppCreateDeliveryPerson() { return useCreateDeliveryPerson({ ...useAuthOptions() }); }
export function useAppUpdateDeliveryPerson() { return useUpdateDeliveryPerson({ ...useAuthOptions() }); }
export function useAppDeleteDeliveryPerson() { return useDeleteDeliveryPerson({ ...useAuthOptions() }); }

export function useAppAdminStats() { return useGetAdminStats(useAuthOptions()); }
export function useAppUploadImage() { return useUploadImage({ ...useAuthOptions() }); }
export function useAppCreateProduct() { return useCreateProduct({ ...useAuthOptions() }); }
export function useAppUpdateProduct() { return useUpdateProduct({ ...useAuthOptions() }); }
export function useAppDeleteProduct() { return useDeleteProduct({ ...useAuthOptions() }); }
export function useAppCreateCategory() { return useCreateCategory({ ...useAuthOptions() }); }
export function useAppUpdateCategory() { return useUpdateCategory({ ...useAuthOptions() }); }
export function useAppDeleteCategory() { return useDeleteCategory({ ...useAuthOptions() }); }
