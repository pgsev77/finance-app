import { formatMoney } from '../lib/utils'

const mockAccounts = [
  { id: 1, name: '微信钱包', type: 'wechat', balance: 125000, currency: 'CNY' },
  { id: 2, name: '支付宝', type: 'alipay', balance: 85600, currency: 'CNY' },
  { id: 3, name: '招商银行', type: 'bank', balance: 2568000, currency: 'CNY' },
  { id: 4, name: '招商信用卡', type: 'credit_card', balance: -15200, currency: 'CNY' },
  { id: 5, name: '现金', type: 'cash', balance: 30000, currency: 'CNY' },
]

const typeIcons: Record<string, string> = { wechat: '微', alipay: '支', bank: '银', credit_card: '信', cash: '现' }
const typeColors: Record<string, string> = { wechat: 'bg-green-500/10 text-green-500', alipay: 'bg-blue-500/10 text-blue-500', bank: 'bg-red-500/10 text-red-500', credit_card: 'bg-orange-500/10 text-orange-500', cash: 'bg-yellow-600/10 text-yellow-600' }

export default function Accounts() {
  const totalBalance = mockAccounts.reduce((s, a) => s + a.balance, 0)

  return (
    <div className="space-y-6">
      {/* Total banner */}
      <div className="bg-gradient-to-r from-accent to-accent-hover rounded-xl p-6 text-white">
        <div className="text-sm opacity-80">总资产</div>
        <div className="text-3xl font-bold mt-1">{formatMoney(totalBalance)}</div>
        <div className="text-sm opacity-70 mt-2">共 {mockAccounts.length} 个账户</div>
      </div>

      {/* Account cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {mockAccounts.map(a => (
          <div key={a.id} className="bg-surface rounded-xl border border-border p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${typeColors[a.type] || 'bg-gray-500/10 text-gray-500'}`}>
                {typeIcons[a.type] || '?'}
              </div>
              <div>
                <div className="text-sm font-medium">{a.name}</div>
                <div className="text-xs text-text-secondary">
                  {{ wechat: '微信支付', alipay: '支付宝', bank: '银行卡', credit_card: '信用卡', cash: '现金' }[a.type]}
                </div>
              </div>
            </div>
            <div className={`mt-4 text-xl font-bold ${a.balance >= 0 ? 'text-text' : 'text-expense'}`}>
              {a.balance >= 0 ? '' : '-'}{formatMoney(Math.abs(a.balance))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
