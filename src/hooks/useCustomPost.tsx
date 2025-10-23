// hooks/useCustomPost.ts

import { useMutation } from "@tanstack/react-query";
import { $api } from "../config/api";
import { tokenName } from "../config/api";

export const useCustomPost = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}) => {
  const postData = async ({
    endpoint,
    body,
    contentType = "application/json",
    headers = {},
    method = "post",
  }: {
    endpoint: string;
    body: any;
    contentType?: string;
    headers?: Record<string, any>;
    method?: "post" | "put" | "patch" | "delete";
  }) => {
    const response = await $api.request({
      url: endpoint,
      method,
      data: body,
      headers: {
        "Content-Type": contentType,
        Authorization: `Bearer ${localStorage.getItem(tokenName)}`,
        ...headers,
      },
    });
    return response.data;
  };

  return useMutation({
    mutationFn: postData,
    onSuccess,
    onError,
  });
};
