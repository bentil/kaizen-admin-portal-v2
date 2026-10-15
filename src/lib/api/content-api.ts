import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contentRequest } from "@/lib/api-client";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/api-error";

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
    onSuccess: () => {
      toast.success("Sub-account updated successfully");
      queryClient.invalidateQueries({ queryKey: ["sub-accounts", orgId] });
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error, "Failed to update sub-account"));
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
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error, "Failed to enable sub-account"));
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
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error, "Failed to disable sub-account"));
    },
  });
};

// Products (content service) ------------------------------------------------

export type ProductStatus = "DRAFT" | "ACTIVE" | "INACTIVE";
export type ProductReviewStatus = "DRAFT" | "SUBMITTED" | "REFERRED" | "APPROVED";

export interface Course {
  id: number;
  organizationId: number;
  code: string;
  title: string;
  fileResourceId?: number;
  requiredForCertification?: boolean;
  type?: string;
  status?: string;
  productId?: number;
  contentConsumptionThreshold?: number;
  minRequiredPassedAssessments?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  enforceStartDate?: boolean;
  enforceEndDate?: boolean;
  createdAt?: string;
  modifiedAt?: string;
  previewImg?: {
    id: number;
    filename: string;
    fileUrl: string;
    type: string;
  };
}

export interface Product {
  id: number;
  code: string;
  name: string;
  description?: string;
  previewImg?: {
    id: number;
    filename?: string;
    fileUrl?: string;
    type?: string;
    size?: number;
  } | null;
  serviceSubcategoryId: number;
  productCategoryId: number;
  isDefault: boolean;
  status: ProductStatus;
  reviewStatus: ProductReviewStatus;
  approvedById?: string | null;
  approvedAt?: string | null;
  referralFeedback?: string | null;
  referralFeedbackById?: string | null;
  referralFeedbackAt?: string | null;
  passCriteria: number;
  organizationId?: number;
  fileResourceId?: number | null;
  createdAt: string;
  updatedAt: string;
  serviceSubcategory?: {
    id: number;
    code: string;
    name?: string;
    serviceCategoryId?: number;
  };
  productCategory?: {
    id: number;
    code: string;
    name?: string;
    description?: string | null;
  };
  courses?: Course[];
  courseCount?: number;
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
  count?: number;
}

export interface GetProductsParams {
  page?: number;
  limit?: number;
  status?: ProductStatus;
  reviewStatus?: ProductReviewStatus;
  serviceSubcategoryId?: number;
  productCategoryId?: number;
  subscribed?: boolean;
}

export interface CreateProductDto {
  code: string;
  name: string;
  description?: string;
  serviceSubcategoryId: number;
  productCategoryId: number;
  passCriteria: number;
  fileResourceId?: number;
  isDefault?: boolean;
  status?: ProductStatus;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  serviceSubcategoryId?: number;
  productCategoryId?: number;
  passCriteria?: number;
  fileResourceId?: number;
  isDefault?: boolean;
  status?: ProductStatus;
  reviewStatus?: ProductReviewStatus;
}

export const useGetProducts = (params: GetProductsParams = {}) => {
  return useQuery({
    queryKey: ["content-products", params],
    queryFn: () =>
      contentRequest<ProductListResponse>({
        url: `/api/v1/product`,
        method: "GET",
        params,
      }),
  });
};

export const useGetProduct = (productId: number | null) => {
  return useQuery({
    queryKey: ["content-products", "detail", productId],
    queryFn: () =>
      contentRequest<{ code: number; message: string; data: Product }>({
        url: `/api/v1/product/${productId}`,
        method: "GET",
      }),
    enabled: productId != null,
  });
};

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

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductDto) =>
      contentRequest<{ code: number; message: string; data: Product }>({
        url: `/api/v1/product`,
        method: "POST",
        data,
      }),
    onSuccess: () => {
      toast.success("Product created successfully");
      queryClient.invalidateQueries({ queryKey: ["content-products"] });
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error, "Failed to create product"));
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, data }: { productId: number; data: UpdateProductDto }) =>
      contentRequest<{ code: number; message: string; data: Product }>({
        url: `/api/v1/product/${productId}`,
        method: "PUT",
        data,
      }),
    onSuccess: () => {
      toast.success("Product updated successfully");
      queryClient.invalidateQueries({ queryKey: ["content-products"] });
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error, "Failed to update product"));
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: number) =>
      contentRequest({
        url: `/api/v1/product/${productId}`,
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Product deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["content-products"] });
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error, "Failed to delete product"));
    },
  });
};

const useProductPatchAction = (
  action: "approve" | "refer" | "set-default",
  messages: { success: string; error: string },
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (param: { productId: number; data?: Record<string, unknown> } | number) => {
      const id = typeof param === "number" ? param : param.productId;
      const body = typeof param === "object" ? param.data : undefined;
      return contentRequest({
        url: `/api/v1/product/${id}/${action}`,
        method: "PATCH",
        data: body,
      });
    },
    onSuccess: () => {
      toast.success(messages.success);
      queryClient.invalidateQueries({ queryKey: ["content-products"] });
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error, messages.error));
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
