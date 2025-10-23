// hooks/useCustomGet.ts

import { useQuery } from "@tanstack/react-query";
import { $api } from "../config/api";
import { tokenName } from "../config/api";

export const useCustomGet = ({
  key,
  endpoint,
  params = {},
  headers = {},
  enabled = true,
  onSuccess,

  onError,
  refetchInterval,
}: any) => {
  const fetchData = async () => {
    const response = await $api.get(endpoint, {
      params,
      headers: {
        Authorization: `Bearer ${localStorage.getItem(tokenName)}`,
        "Accept-Language": "ru",
        ...headers,
      },
    });
    return response.data;
  };

  return useQuery({
    queryKey: [key, params],
    queryFn: fetchData,
    enabled,
    // @ts-ignore
    onSuccess,
    onError,
    refetchInterval,
    refetchOnMount: true,
    staleTime: 0,
  });
};
