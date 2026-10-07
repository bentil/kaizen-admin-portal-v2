import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contentRequest } from "@/lib/api-client";
import { toast } from "sonner";

export interface SubAccount {
  id: number;
  userId: string;
  contentProviderOrgId: number;
  revenueSharePercentage: number;
  status: "ACTIVE" | "DISABLED" | "PENDING";
  invitedAt: string;
  acceptedAt?: string;
  disabledAt?: string;
  disabledReason?: string;
  user: {
    id?: number;
    firstName?: string;
    lastName?: string;
    emailAddress?: string;
    username?: string;
    imageUrl?: string;
  };
}

export interface SubAccountListResponse {
  data: SubAccount[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface UpdateSubAccountDto {
  revenueSharePercentage?: number;
  status?: "ACTIVE" | "DISABLED";
  disabledReason?: string;
}

// Hooks
export const useGetSubAccounts = (orgId: number, params: { status?: string; page?: number; limit?: number } = {}) => {
  return useQuery({
    queryKey: ["sub-accounts", orgId, params],
    queryFn: () =>
      contentRequest<SubAccountListResponse>({
        url: `/api/v1/organizations/${orgId}/sub-accounts`,
        method: "GET",
        params,
      }),
    enabled: !!orgId,
  });
};

export const useUpdateSubAccount = (orgId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ subAccountId, data }: { subAccountId: number; data: UpdateSubAccountDto }) =>
      contentRequest({
        url: `/api/v1/organizations/${orgId}/sub-accounts/${subAccountId}`,
        method: "PATCH",
        data,
      }),
    onSuccess: (_, variables) => {
      toast.success("Sub-account updated successfully");
      queryClient.invalidateQueries({ queryKey: ["sub-accounts", orgId] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update sub-account");
    },
  });
};

export const useEnableSubAccount = (orgId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subAccountId: number) =>
      contentRequest({
        url: `/api/v1/organizations/${orgId}/sub-accounts/${subAccountId}/enable`,
        method: "POST",
      }),
    onSuccess: () => {
      toast.success("Sub-account enabled");
      queryClient.invalidateQueries({ queryKey: ["sub-accounts", orgId] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to enable sub-account");
    },
  });
};

export const useDisableSubAccount = (orgId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subAccountId: number) =>
      contentRequest({
        url: `/api/v1/organizations/${orgId}/sub-accounts/${subAccountId}/disable`,
        method: "POST",
      }),
    onSuccess: () => {
      toast.success("Sub-account disabled");
      queryClient.invalidateQueries({ queryKey: ["sub-accounts", orgId] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to disable sub-account");
    },
  });
};

// Products (content service) ------------------------------------------------

export type ProductStatus = "DRAFT" | "ACTIVE" | "INACTIVE";
export type ProductReviewStatus = "DRAFT" | "SUBMITTED" | "REFERRED" | "APPROVED";

export interface Product {
  id: number;
  code: string;
  name: string;
  description?: string;
  previewImg?: unknown;
  serviceSubcategoryId: number;
  productCategoryId: number;
  isDefault: boolean;
  status: ProductStatus;
  reviewStatus: ProductReviewStatus;
  approvedById?: string;
  approvedAt?: string;
  passCriteria: number;
  createdAt: string;
  updatedAt: string;
  serviceSubcategory?: {
    id: number;
    code: string;
    name?: string;
  };
}

export interface ProductListResponse {
  code: number;
  message: string;
  requestId: string;
  errors?: unknown[] | null;
  data: Product[];
  page?: number;
  totalCount?: number;
  pageSize?: number;
}

export interface GetProductsParams {
  page?: number;
  status?: ProductStatus;
  reviewStatus?: ProductReviewStatus;
  serviceSubcategoryId?: number;
  productCategoryId?: number;
  subscribed?: boolean;
}

export const useGetProductsByCategory = (
  productCategoryId: number | null,
  params: Omit<GetProductsParams, "productCategoryId"> = {},
) => {
  return useQuery({
    queryKey: ["content-products", "by-category", productCategoryId, params],
    queryFn: () =>
      contentRequest<ProductListResponse>({
        url: `/api/v1/product`,
        method: "GET",
        params: { productCategoryId, ...params },
      }),
    enabled: productCategoryId != null,
  });
};

const useProductPatchAction = (
  action: "approve" | "refer" | "set-default",
  messages: { success: string; error: string },
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: number) =>
      contentRequest({
        url: `/api/v1/product/${productId}/${action}`,
        method: "PATCH",
      }),
    onSuccess: () => {
      toast.success(messages.success);
      queryClient.invalidateQueries({ queryKey: ["content-products"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || messages.error);
    },
  });
};

export const useApproveProduct = () =>
  useProductPatchAction("approve", {
    success: "Product approved",
    error: "Failed to approve product",
  });

export const useReferProduct = () =>
  useProductPatchAction("refer", {
    success: "Product referred back to creator",
    error: "Failed to refer product",
  });

export const useSetDefaultProduct = () =>
  useProductPatchAction("set-default", {
    success: "Product set as default",
    error: "Failed to set default product",
  });
