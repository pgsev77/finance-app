import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api'
import type { SubscriptionCreate, SubscriptionUpdate } from '@/types'
import { toast } from 'sonner'

export function useSubscriptions() {
  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => api.getSubscriptions(),
  })
}

export function useSubscriptionSummary() {
  return useQuery({
    queryKey: ['subscriptions', 'summary'],
    queryFn: () => api.getSubscriptionSummary(),
  })
}

export function useSubscriptionCategories() {
  return useQuery({
    queryKey: ['subscriptions', 'categories'],
    queryFn: () => api.getSubscriptionCategories(),
  })
}

export function useCreateSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SubscriptionCreate) => api.createSubscription(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] })
      toast.success('订阅已创建')
    },
  })
}

export function useUpdateSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SubscriptionUpdate }) => api.updateSubscription(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] })
    },
  })
}

export function useDeleteSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteSubscription(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] })
      toast.success('订阅已删除')
    },
  })
}
