import { 
  useGetProducts, useGetProduct, useGetCategories,
  useSignup, useLogin, useLogout, useGetMe, useUpdateLocation, useUpdateMe,
  useAdminLogin, useCreateCategory, useUpdateCategory, useDeleteCategory,
  useCreateProduct, useUpdateProduct, useDeleteProduct,
  useGetOrders, useCreateOrder, useGetOrder,
  useAdminGetOrders, useUpdateOrderStatus, useAssignDelivery,
  useGetDeliveryPersons, useCreateDeliveryPerson, useUpdateDeliveryPerson, useDeleteDeliveryPerson,
  useGetAdminStats, useUploadImage,
  useGetAdmins, useCreateAdmin, useUpdateAdmin,
  useGetLowStockProducts,
} from '@workspace/api-client-react';

export function useAppProducts(params?: Parameters<typeof useGetProducts>[0]) { return useGetProducts(params); }
export function useAppProduct(id: number) { return useGetProduct(id); }
export function useAppCategories() { return useGetCategories(); }

export function useAppSignup() { return useSignup(); }
export function useAppLogin() { return useLogin(); }
export function useAppLogout() { return useLogout(); }
export function useAppMe() { return useGetMe(); }
export function useAppUpdateLocation() { return useUpdateLocation(); }
export function useAppUpdateMe() { return useUpdateMe(); }

export function useAppAdminLogin() { return useAdminLogin(); }
export function useAppOrders() { return useGetOrders(); }
export function useAppOrder(id: number) { return useGetOrder(id); }
export function useAppCreateOrder() { return useCreateOrder(); }

export function useAppAdminOrders(params?: Parameters<typeof useAdminGetOrders>[0]) { return useAdminGetOrders(params); }
export function useAppUpdateOrderStatus() { return useUpdateOrderStatus(); }
export function useAppAssignDelivery() { return useAssignDelivery(); }

export function useAppDeliveryPersons() { return useGetDeliveryPersons(); }
export function useAppCreateDeliveryPerson() { return useCreateDeliveryPerson(); }
export function useAppUpdateDeliveryPerson() { return useUpdateDeliveryPerson(); }
export function useAppDeleteDeliveryPerson() { return useDeleteDeliveryPerson(); }

export function useAppAdminStats() { return useGetAdminStats(); }
export function useAppUploadImage() { return useUploadImage(); }
export function useAppCreateProduct() { return useCreateProduct(); }
export function useAppUpdateProduct() { return useUpdateProduct(); }
export function useAppDeleteProduct() { return useDeleteProduct(); }
export function useAppCreateCategory() { return useCreateCategory(); }
export function useAppUpdateCategory() { return useUpdateCategory(); }
export function useAppDeleteCategory() { return useDeleteCategory(); }

export function useAppAdmins() { return useGetAdmins(); }
export function useAppCreateAdmin() { return useCreateAdmin(); }
export function useAppUpdateAdmin() { return useUpdateAdmin(); }

export function useAppLowStockProducts() { return useGetLowStockProducts(); }
