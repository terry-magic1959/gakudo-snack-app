const fs = require('fs');

let content = fs.readFileSync('components/snack-dashboard.tsx', 'utf8');

// Add state import if not present
if (!content.includes('import { Home, Camera, ClipboardList, ShoppingCart, BarChart2 } from "lucide-react";')) {
    // Find where react imports are and add lucide-react
    content = content.replace(
        /import \{\n  FormEvent,/g,
        `import { Home, Camera, ClipboardList, ShoppingCart, BarChart2 } from "lucide-react";\nimport {\n  FormEvent,`
    );
}

// Add activeTab state
if (!content.includes('const [activeTab, setActiveTab] =')) {
    content = content.replace(
        /const \[loading, setLoading\] = useState\(true\);/,
        `const [activeTab, setActiveTab] = useState<"inventory" | "register" | "intake" | "order" | "analytics">("inventory");\n  const [loading, setLoading] = useState(true);`
    );
}

// Replace <main> structure
const oldReturnStart = content.indexOf('return (\n    <main className="max-w-lg mx-auto p-4 space-y-6 pb-24">');
const oldReturnEnd = content.indexOf('   </main >\n  );\n}\n\nfunction formatDate');

if (oldReturnStart !== -1 && oldReturnEnd !== -1) {
    let innerHtml = content.substring(
        oldReturnStart + 'return (\n    <main className="max-w-lg mx-auto p-4 space-y-6 pb-24">'.length,
        oldReturnEnd
    );

    // We have sections to split up. We can use regex or string methods.
    // Section 1: Header (lines 425-448) -> Inventory
    // Section 2: Notifications (450-491) -> Inventory
    // Section 3: Analytics (493-640) -> Analytics
    // Section 4: Camera (641-732) -> Register
    // Section 5: Register form + Inventory list (734-926) -> Split!
    // Section 6: Intake (927-1043) -> Intake
    // Section 7: Order (1045-1294) -> Order

    const splitReturn = `return (
    <div className="flex flex-col min-h-dvh bg-surface">
      <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] overflow-y-auto">
        <div className="max-w-lg mx-auto p-4 space-y-6">

          {activeTab === "inventory" && (
            <>
              {/* === INVENTORY TAB === */}
              <section className="glass-card rounded-2xl p-5 md:p-6 text-center shadow-sm">
                <h1>おやつ在庫一覧</h1>
                <div className="flex flex-wrap items-center gap-2 justify-center mt-2">
                  <button
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                    onClick={() => void loadAll()} disabled={loading}
                  >
                    {loading ? "更新中..." : "再読み込み"}
                  </button>
                </div>
                {message && <div className="text-sm font-bold text-green-600 mt-2">{message}</div>}
                {error && <div className="text-sm font-bold text-red-500 mt-2">{error}</div>}
              </section>

              {/* Notifications */}
              {(lowStockSnacks.length > 0 || expiringSnacks.length > 0) && (
                <section className="glass-card rounded-2xl p-4 shadow-sm border border-red-100">
                  <h2 className="text-red-500">⚠️ アラート通知</h2>
                  <div className="space-y-4 mt-3">
                  {lowStockSnacks.length > 0 && (
                    <div>
                      <h3 className="font-bold text-sm mb-2">📦 在庫不足（{lowStockSnacks.length}件）</h3>
                      <div className="space-y-2">
                        {lowStockSnacks.map((s) => (
                          <div key={s.id} className="flex justify-between items-center bg-red-50 p-2 rounded-lg text-sm">
                            <span className="font-medium text-red-700">{s.name}</span>
                            <span className="text-red-600">在庫: {s.currentStock}{s.unit} / 最低: {s.minStockLevel}{s.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {expiringSnacks.length > 0 && (
                    <div>
                      <h3 className="font-bold text-sm mb-2 mt-4">⏰ 賞味期限注意（{expiringSnacks.length}件）</h3>
                      <div className="space-y-2">
                        {expiringSnacks.map((s) => {
                          const status = getExpirationStatus(s.expirationDate);
                          return (
                            <div key={s.id} className="flex justify-between items-center bg-orange-50 p-2 rounded-lg text-sm">
                              <span className="font-medium text-orange-700">{s.name}</span>
                              <span className={status.className}>{status.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  </div>
                </section>
              )}

              {/* Inventory List extracted from sections */}
              <section className="glass-card rounded-2xl p-4 space-y-4 shadow-sm relative">
                <h2>在庫一覧</h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>おやつ</th>
                        <th>在庫状況</th>
                        <th>賞味期限</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snacks.length === 0 ? (
                        <tr><td colSpan={3}>データなし</td></tr>
                      ) : (
                        snacks.map((snack) => {
                          const expStatus = getExpirationStatus(snack.expirationDate);
                          return (
                            <tr key={snack.id}>
                              <td>
                                <div className="font-medium">{snack.name}</div>
                                <div className="text-xs text-text-muted">{snackCategoryLabels[snack.category] ?? snack.category}</div>
                              </td>
                              <td>
                                <div>{snack.currentStock} / {snack.minStockLevel} {snack.unit}</div>
                                {snack.currentStock <= snack.minStockLevel ? <span className="text-xs text-red-500 font-bold">要発注</span> : null}
                              </td>
                              <td>
                                {snack.expirationDate ? (
                                  <>
                                    <div className="text-sm text-text-muted">{formatDate(snack.expirationDate)}</div>
                                    <span className={expStatus.className}>{expStatus.label}</span>
                                  </>
                                ) : <span className="text-sm text-text-muted">-</span>}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {activeTab === "register" && (
            <>
              {/* === REGISTER TAB === */}
              <section className="glass-card rounded-2xl p-4 space-y-4 shadow-sm relative">
                <h2>写真でおやつ判別 (Gemini AI)</h2>
                <div className="text-sm text-text-muted">
                  写真からおやつの名前と賞味期限を読み取ります。
                </div>
                <div className="row mt-2">
                  <label>
                    画像ファイル
                    <input type="file" accept="image/*" capture="environment" onChange={(e) => void onFileSelected(e.target.files?.[0] ?? null)} />
                  </label>
                </div>
                {previewImage && (
                  <div className="relative mt-3 rounded-xl overflow-hidden shadow-sm">
                    <img className="w-full object-cover max-h-[240px]" src={previewImage} alt="プレビュー" />
                  </div>
                )}
                <div className="mt-2 text-center">
                  <button className="btn-primary w-full" onClick={() => void handleClassify()}>判別する</button>
                </div>
                
                {classification?.prediction && (
                  <div className="space-y-3 mt-4">
                    <div className="border border-primary-200 rounded-xl p-3 bg-white">
                      <div><strong>判定:</strong> {classification.prediction.name}</div>
                      <div className="text-sm text-text-muted mt-1">
                        <span className="inline-flex items-center px-2 py-1 rounded-lg bg-gray-100 text-gray-700">{snackCategoryLabels[classification.prediction.category] ?? classification.prediction.category}</span>
                        <span className="ml-2">信頼度: {(classification.prediction.confidence * 100).toFixed(0)}%</span>
                      </div>
                      {classification.prediction.expirationDate && (
                        <div className="text-sm text-text-muted mt-2">
                          <strong>読み取り賞味期限:</strong> <span className="badge caution">{classification.prediction.expirationDate}</span>
                        </div>
                      )}
                      <div className="text-sm text-text-muted mt-2">
                        {classification.matchedSnack ? (
                          <><strong>登録済みの候補:</strong> {classification.matchedSnack.name}</>
                        ) : (
                          <><strong>登録済みの候補:</strong> なし（新規登録の可能性があります）</>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <section className="glass-card rounded-2xl p-4 space-y-4 shadow-sm relative">
                <h2>新規登録 / 追加</h2>
                <form onSubmit={handleSnackCreate}>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <label>おやつ名<input className="input-field" value={snackForm.name} onChange={(e) => setSnackForm((p) => ({ ...p, name: e.target.value }))} required /></label>
                    <label>分類
                      <select className="input-field" value={snackForm.category} onChange={(e) => setSnackForm((p) => ({ ...p, category: e.target.value }))}>
                        {snackCategoryOptions.map((cat) => <option key={cat} value={cat}>{snackCategoryLabels[cat]}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <label>単位<input className="input-field" value={snackForm.unit} onChange={(e) => setSnackForm((p) => ({ ...p, unit: e.target.value }))} /></label>
                    <label>人数目安<input className="input-field" type="number" min={1} value={snackForm.packageSize} onChange={(e) => setSnackForm((p) => ({ ...p, packageSize: Number(e.target.value) }))} /></label>
                    <label>現在在庫<input className="input-field" type="number" min={0} value={snackForm.currentStock} onChange={(e) => setSnackForm((p) => ({ ...p, currentStock: Number(e.target.value) }))} /></label>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <label>最低在庫<input className="input-field" type="number" min={0} value={snackForm.minStockLevel} onChange={(e) => setSnackForm((p) => ({ ...p, minStockLevel: Number(e.target.value) }))} /></label>
                    <label>賞味期限<input className="input-field" type="date" value={snackForm.expirationDate} onChange={(e) => setSnackForm((p) => ({ ...p, expirationDate: e.target.value }))} /></label>
                  </div>
                  <button type="submit" className="btn-primary w-full">おやつを登録</button>
                </form>
              </section>
            </>
          )}

          {activeTab === "intake" && (
            <>
              {/* === INTAKE TAB === */}
              <section className="glass-card rounded-2xl p-4 space-y-4 shadow-sm relative">
                <h2>配布記録（消費ログ）</h2>
                <form onSubmit={handleIntakeCreate}>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <label>おやつ
                      <select className="input-field" value={intakeForm.snackId} onChange={(e) => setIntakeForm((p) => ({ ...p, snackId: e.target.value }))}>
                        <option value="">選択</option>
                        {snacks.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </label>
                    <label>配布日<input type="date" className="input-field" value={intakeForm.servedDate} onChange={(e) => setIntakeForm((p) => ({ ...p, servedDate: e.target.value }))} /></label>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <label>配布数（人分）<input type="number" min={1} className="input-field" value={intakeForm.servings} onChange={(e) => setIntakeForm((p) => ({ ...p, servings: Number(e.target.value) }))} /></label>
                    <label>児童数（任意）<input type="number" min={0} className="input-field" value={intakeForm.childrenCount} onChange={(e) => setIntakeForm((p) => ({ ...p, childrenCount: Number(e.target.value) }))} /></label>
                  </div>
                  <div className="mb-4">
                    <label>メモ<input className="input-field" value={intakeForm.memo} onChange={(e) => setIntakeForm((p) => ({ ...p, memo: e.target.value }))} /></label>
                  </div>
                  <button type="submit" className="w-full py-3 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-sm transition-all active:scale-95">配布を記録</button>
                </form>
              </section>

              <section className="glass-card rounded-2xl p-4 space-y-4 shadow-sm relative">
                <h3>直近の配布記録</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>日付</th><th>おやつ</th><th>配布数</th></tr>
                    </thead>
                    <tbody>
                      {logs.length === 0 ? <tr><td colSpan={3}>なし</td></tr> : 
                        logs.slice(0, 10).map((l) => (
                          <tr key={l.id}>
                            <td>{formatDate(l.servedDate)}</td>
                            <td>{l.snack.name}</td>
                            <td>{l.servings}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {activeTab === "order" && (
            <>
              {/* === ORDER TAB === */}
              <section className="glass-card rounded-2xl p-4 space-y-4 shadow-sm relative">
                <h2>発注登録</h2>
                <form onSubmit={handleOrderCreate}>
                  <div className="space-y-3 mb-4">
                    {orderForm.items.map((item, index) => (
                      <div key={item.id} className="border border-primary-200 rounded-xl p-3 bg-white">
                        <label className="block mb-2 text-sm text-text-secondary">おやつ
                          <select className="input-field mt-1" value={item.snackId} onChange={(e) => updateOrderItem(item.id, { snackId: e.target.value })}>
                            <option value="">選択</option>
                            {snacks.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <label className="text-sm text-text-secondary">数量<input type="number" min={1} className="input-field mt-1" value={item.quantity} onChange={(e) => updateOrderItem(item.id, { quantity: Number(e.target.value) })} /></label>
                          <label className="text-sm text-text-secondary">単価<input type="number" min={0} className="input-field mt-1" value={item.unitPrice} onChange={(e) => updateOrderItem(item.id, { unitPrice: e.target.value })} placeholder="任意" /></label>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mb-4">
                    <button type="button" className="flex-1 py-2 bg-gray-100 rounded-xl" onClick={addOrderItem}>+ 追加</button>
                    <button type="submit" className="flex-1 py-2 bg-orange-500 text-white rounded-xl font-bold">発注</button>
                  </div>
                </form>
              </section>

              <section className="glass-card rounded-2xl p-4 space-y-4 shadow-sm relative">
                <h3>おすすめ発注候補</h3>
                <div className="table-wrap text-sm">
                  <table>
                    <thead><tr><th>おやつ</th><th>推奨発注</th></tr></thead>
                    <tbody>
                      {recommendations.length === 0 ? <tr><td colSpan={2}>なし</td></tr> : 
                        recommendations.map((r) => (
                          <tr key={r.snackId}>
                            <td>{r.snackName}<div className="text-xs text-text-muted">在庫:{r.currentStock}</div></td>
                            <td className="text-red-500 font-bold">{r.suggestedQty} {r.unit}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {activeTab === "analytics" && (
            <>
              {/* === ANALYTICS TAB === */}
              <section className="glass-card rounded-2xl p-4 space-y-4 shadow-sm relative">
                <h2>レポート & 分析</h2>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <label>単位
                    <select className="input-field" value={period} onChange={(e) => setPeriod(e.target.value as "week" | "month")}>
                      <option value="week">週別</option>
                      <option value="month">月別</option>
                    </select>
                  </label>
                  <label>基準日
                    <input type="date" className="input-field" value={analysisDate} onChange={(e) => setAnalysisDate(e.target.value)} />
                  </label>
                </div>
                {analytics && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="glass-card rounded-xl p-3 text-center border border-gray-100">
                      <div className="text-2xl font-bold text-primary-600">{analytics.summary.totalServings}</div>
                      <div className="text-xs text-text-secondary">総配布数</div>
                    </div>
                    <div className="glass-card rounded-xl p-3 text-center border border-gray-100">
                      <div className="text-2xl font-bold text-primary-600">¥{analytics.summary.totalOrderCost.toLocaleString()}</div>
                      <div className="text-xs text-text-secondary">発注金額</div>
                    </div>
                  </div>
                )}
                <div className="text-center mt-4">
                  <button className="px-4 py-2 bg-gray-100 rounded-xl" onClick={() => downloadAnalyticsCsv(period)}>CSV出力</button>
                </div>
              </section>
            </>
          )}

        </div>
      </main>

      {/* Tabs Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-[max(8px,env(safe-area-inset-bottom))] z-50">
        <div className="max-w-lg mx-auto flex justify-around items-center h-[60px] px-1">
          <button onClick={() => setActiveTab('inventory')} className={\`flex flex-col items-center justify-center w-full h-full space-y-1 \${activeTab === 'inventory' ? 'text-primary-500' : 'text-text-muted hover:text-text-primary'}\`}>
            <Home size={24} strokeWidth={activeTab === 'inventory' ? 2.5 : 2} />
            <span className="text-[10px] font-medium leading-none">在庫</span>
          </button>
          
          <button onClick={() => setActiveTab('register')} className={\`flex flex-col items-center justify-center w-full h-full space-y-1 \${activeTab === 'register' ? 'text-primary-500' : 'text-text-muted hover:text-text-primary'}\`}>
            <Camera size={24} strokeWidth={activeTab === 'register' ? 2.5 : 2} />
            <span className="text-[10px] font-medium leading-none">登録</span>
          </button>

          <button onClick={() => setActiveTab('intake')} className={\`flex flex-col items-center justify-center w-full h-full space-y-1 \${activeTab === 'intake' ? 'text-primary-500' : 'text-text-muted hover:text-text-primary'}\`}>
            <ClipboardList size={24} strokeWidth={activeTab === 'intake' ? 2.5 : 2} />
            <span className="text-[10px] font-medium leading-none">記録</span>
          </button>

          <button onClick={() => setActiveTab('order')} className={\`flex flex-col items-center justify-center w-full h-full space-y-1 \${activeTab === 'order' ? 'text-primary-500' : 'text-text-muted hover:text-text-primary'}\`}>
            <ShoppingCart size={24} strokeWidth={activeTab === 'order' ? 2.5 : 2} />
            <span className="text-[10px] font-medium leading-none">発注</span>
          </button>

          <button onClick={() => setActiveTab('analytics')} className={\`flex flex-col items-center justify-center w-full h-full space-y-1 \${activeTab === 'analytics' ? 'text-primary-500' : 'text-text-muted hover:text-text-primary'}\`}>
            <BarChart2 size={24} strokeWidth={activeTab === 'analytics' ? 2.5 : 2} />
            <span className="text-[10px] font-medium leading-none">分析</span>
          </button>
        </div>
      </nav>
    </div>
  );
}`;

    const newContent = content.substring(0, oldReturnStart) + splitReturn + '\n}\n\nfunction formatDate' + content.substring(oldReturnEnd + '   </main >\n  );\n}\n\nfunction formatDate'.length);
    fs.writeFileSync('components/snack-dashboard.tsx', newContent);
    console.log('Successfully replaced return block');
} else {
    console.log('Could not find the start or end of the return block.');
}
