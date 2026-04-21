import { 
  useGetProducts, useGetProduct, useGetCategories,
  useSignup, useLogin, useLogout, useGetMe, useUpdateLocation, useUpdateMe,
  useAdminLogin, useCreateCategory, useUpdateCategory, useDeleteCategory,
  useCreateProduct, useUpdateProduct, useDeleteProduct,
  useGetOrders, useCreateOrder, useGetOrder, useCancelOrder, useModifyOrder,
  useAdminGetOrders, useUpdateOrderStatus, useAssignDelivery,
  useGetDeliveryPersons, useCreateDeliveryPerson, useUpdateDeliveryPerson, useDeleteDeliveryPerson,
  useGetAdminStats, useUploadImage, useUploadMedia,
  useGetAdmins, useCreateAdmin, useUpdateAdmin,
  useGetLowStockProducts,
  useGetOrderedProducts,
  useAdminGetSuppliers, useAdminCreateSupplier, useAdminUpdateSupplier, useAdminDeleteSupplier,
  useAdminGetSupplierOrders, useAdminCreateSupplierOrder, useAdminGetSupplierOrder, useAdminDeleteSupplierOrder,
  useGetPublicChat, useSendPublicChatMessage, useReactToPublicMessage,
  useGetPrivateConversations, useGetPrivateThread, useSendPrivateMessage,
  useMarkPrivateThreadRead, useSendTypingIndicator,
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
export function useAppUploadMedia() { return useUploadMedia(); }
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
export function useAppOrderedProducts() { return useGetOrderedProducts(); }

export function useAppCancelOrder() { return useCancelOrder(); }
export function useAppModifyOrder() { return useModifyOrder(); }

export function useAppSuppliers() { return useAdminGetSuppliers(); }
export function useAppCreateSupplier() { return useAdminCreateSupplier(); }
export function useAppUpdateSupplier() { return useAdminUpdateSupplier(); }
export function useAppDeleteSupplier() { return useAdminDeleteSupplier(); }

export function useAppSupplierOrders() { return useAdminGetSupplierOrders(); }
export function useAppCreateSupplierOrder() { return useAdminCreateSupplierOrder(); }
export function useAppSupplierOrder(id: number) { return useAdminGetSupplierOrder(id); }
export function useAppDeleteSupplierOrder() { return useAdminDeleteSupplierOrder(); }

export function useAppPublicChat(params?: Parameters<typeof useGetPublicChat>[0]) { return useGetPublicChat(params); }
export function useAppSendPublicMessage() { return useSendPublicChatMessage(); }
export function useAppReactToPublicMessage() { return useReactToPublicMessage(); }

export function useAppPrivateConversations() { return useGetPrivateConversations(); }
export function useAppPrivateThread(customerId: number) { return useGetPrivateThread(customerId); }
export function useAppSendPrivateMessage() { return useSendPrivateMessage(); }
export function useAppMarkThreadRead() { return useMarkPrivateThreadRead(); }
export function useAppSendTyping() { return useSendTypingIndicator(); }
