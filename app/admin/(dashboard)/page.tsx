import { requireParent } from '@/lib/session'
import { listAdminChannels, listAdminManualVideos } from '@/domain/catalog/catalog-service'
import { addByUrl, syncNow, hideVideoAction, deleteChannelAction } from '../actions'
import { AddForm } from '../AddForm'

export default async function AdminCatalog() {
  const parent = await requireParent()
  const [channels, videos] = await Promise.all([
    listAdminChannels(parent.accountId),
    listAdminManualVideos(parent.accountId),
  ])
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <div className="flex-1"><AddForm action={addByUrl} /></div>
        <form action={syncNow}><button className="rounded-lg bg-gray-700 px-4 py-2 text-white">↻ Синхронизировать</button></form>
      </div>

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase text-gray-500">Одобренные каналы</h2>
        <div className="divide-y rounded-xl border bg-white">
          {channels.length === 0 ? <p className="p-3 text-sm text-gray-400">Пока нет каналов</p> : channels.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3">
              <img src={c.thumbnailUrl || '/placeholder.png'} alt="" className="h-10 w-10 rounded-lg object-cover" />
              <div className="flex-1">
                <div className="text-sm font-bold">{c.title}</div>
                <div className="text-xs text-gray-500">{c._count.videos} видео · {c.lastSyncedAt ? `синхр. ${c.lastSyncedAt.toLocaleString('ru')}` : 'не синхронизирован'}</div>
              </div>
              <form action={deleteChannelAction}><input type="hidden" name="channelId" value={c.id} /><button className="text-xs text-red-600">Удалить</button></form>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase text-gray-500">Отдельные видео</h2>
        <div className="grid grid-cols-3 gap-3">
          {videos.map((v) => (
            <div key={v.id} className="rounded-xl border bg-white p-2">
              <img src={v.thumbnailUrl} alt="" className="h-24 w-full rounded-lg object-cover" />
              <div className="mt-1 text-xs font-semibold">{v.title}</div>
              <form action={hideVideoAction}><input type="hidden" name="videoId" value={v.id} /><button className="mt-1 text-xs text-red-600">Скрыть</button></form>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
