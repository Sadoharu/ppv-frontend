// src/features/auth/utils/reasonMessage.ts
//done
export function reasonMessage(reason?: string | null) {
  switch (reason) {
    case 'token_expired': return 'Сесія завершена. Увійдіть знову.'
    case 'token_invalid': return 'Недійсна сесія. Увійдіть знову.'
    case 'missing_token': return 'Потрібно увійти для доступу до адмінки.'
    default: return null
  }
}