'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import Sidebar from './components/Sidebar'

interface Stats {
  totalUsers: number
  totalImages: number
  totalCaptions: number
  totalVotes: number
  superadmins: number
  newUsersThisWeek: number
  avgVotesPerCaption: number
  avgCaptionsPerImage: number
  topVotedCaptions: { id: number; text: string; votes: number }[]
  votingActivityByDay: { day: string; votes: number }[]
  userGrowth: { date: string; count: number }[]
  captionEngagement: { bucket: string; count: number }[]
  imagesWithMostCaptions: { id: number; caption_count: number }[]
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  const colors: Record<string, string> = {
    violet: 'from-violet-600/20 to-violet-900/10 border-violet-700/50',
    blue: 'from-blue-600/20 to-blue-900/10 border-blue-700/50',
    green: 'from-green-600/20 to-green-900/10 border-green-700/50',
    amber: 'from-amber-600/20 to-amber-900/10 border-amber-700/50',
    rose: 'from-rose-600/20 to-rose-900/10 border-rose-700/50',
    cyan: 'from-cyan-600/20 to-cyan-900/10 border-cyan-700/50',
    purple: 'from-purple-600/20 to-purple-900/10 border-purple-700/50',
    teal: 'from-teal-600/20 to-teal-900/10 border-teal-700/50',
  }
  return (
    <div className={`bg-gradient-to-br ${colors[color] || colors.violet} border rounded-2xl p-5`}>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm font-medium text-gray-300">{label}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  )
}

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  const barColors: Record<string, string> = {
    violet: 'bg-violet-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    cyan: 'bg-cyan-500',
  }
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span className="truncate max-w-[200px]">{label}</span>
        <span className="font-mono ml-2">{value}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColors[color] || barColors.violet} rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function DayHeatmap({ data }: { data: { day: string; votes: number }[] }) {
  const max = Math.max(...data.map(d => d.votes), 1)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return (
    <div className="flex gap-2 items-end">
      {days.map((day) => {
        const found = data.find(d => d.day === day)
        const val = found?.votes || 0
        const h = Math.max(8, Math.round((val / max) * 60))
        const opacity = val === 0 ? 0.1 : 0.2 + (val / max) * 0.8
        return (
          <div key={day} className="flex flex-col items-center gap-1 flex-1">
            <div
              className="w-full rounded-lg bg-violet-500 transition-all"
              style={{ height: `${h}px`, opacity }}
              title={`${val} votes`}
            />
            <span className="text-xs text-gray-500">{day}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState('')
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const [
        usersRes,
        imagesRes,
        captionsRes,
        votesRes,
        superadminsRes,
        weekUsersRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('images').select('id', { count: 'exact', head: true }),
        supabase.from('captions').select('id', { count: 'exact', head: true }),
        supabase.from('caption_votes').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_superadmin', true),
        supabase.from('profiles').select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      ])

      const totalUsers = usersRes.count || 0
      const totalImages = imagesRes.count || 0
      const totalCaptions = captionsRes.count || 0
      const totalVotes = votesRes.count || 0
      const superadmins = superadminsRes.count || 0
      const newUsersThisWeek = weekUsersRes.count || 0

      // Fetch captions for top-voted analysis
      const { data: captionsData } = await supabase
        .from('captions')
        .select('id, text')
        .limit(50)

      let topVotedCaptions: { id: number; text: string; votes: number }[] = []
      const cvMap: Record<number, number> = {}

      if (captionsData && captionsData.length > 0) {
        const captionIds = captionsData.map((c: { id: number }) => c.id)
        const { data: voteCounts } = await supabase
          .from('caption_votes')
          .select('caption_id')
          .in('caption_id', captionIds)

        voteCounts?.forEach((v: { caption_id: number }) => {
          cvMap[v.caption_id] = (cvMap[v.caption_id] || 0) + 1
        })

        topVotedCaptions = captionsData
          .map((c: { id: number; text: string }) => ({ id: c.id, text: c.text, votes: cvMap[c.id] || 0 }))
          .sort((a: { votes: number }, b: { votes: number }) => b.votes - a.votes)
          .slice(0, 5)
      }

      // Voting activity by day of week
      const { data: recentVotes } = await supabase
        .from('caption_votes')
        .select('created_datetime_utc')
        .order('created_datetime_utc', { ascending: false })
        .limit(500)

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const dayCounts: Record<string, number> = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 }
      recentVotes?.forEach((v: { created_datetime_utc: string }) => {
        if (v.created_datetime_utc) {
          const day = dayNames[new Date(v.created_datetime_utc).getDay()]
          dayCounts[day] = (dayCounts[day] || 0) + 1
        }
      })
      const votingActivityByDay = dayNames.map(d => ({ day: d, votes: dayCounts[d] }))

      // User growth over last 7 days
      const { data: recentProfiles } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
        .order('created_at', { ascending: true })

      const growthMap: Record<string, number> = {}
      for (let i = 6; i >= 0; i--) {
        const key = new Date(Date.now() - i * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        growthMap[key] = 0
      }
      recentProfiles?.forEach((p: { created_at: string }) => {
        const key = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        if (key in growthMap) growthMap[key]++
      })
      const userGrowth = Object.entries(growthMap).map(([date, count]) => ({ date, count }))

      // Caption engagement buckets
      const { data: allVotes } = await supabase
        .from('caption_votes')
        .select('caption_id')
        .limit(2000)

      const allVoteMap: Record<number, number> = {}
      allVotes?.forEach((v: { caption_id: number }) => {
        allVoteMap[v.caption_id] = (allVoteMap[v.caption_id] || 0) + 1
      })

      const buckets = { '0 votes': 0, '1–2 votes': 0, '3–5 votes': 0, '6+ votes': 0 }
      captionsData?.forEach((c: { id: number }) => {
        const n = allVoteMap[c.id] || 0
        if (n === 0) buckets['0 votes']++
        else if (n <= 2) buckets['1–2 votes']++
        else if (n <= 5) buckets['3–5 votes']++
        else buckets['6+ votes']++
      })
      const captionEngagement = Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }))

      // Images with most captions
      const { data: allCaptionsForImages } = await supabase
        .from('captions')
        .select('image_id')
        .limit(2000)

      const imgCapMap: Record<number, number> = {}
      allCaptionsForImages?.forEach((c: { image_id: number }) => {
        if (c.image_id) imgCapMap[c.image_id] = (imgCapMap[c.image_id] || 0) + 1
      })
      const imagesWithMostCaptions = Object.entries(imgCapMap)
        .map(([id, caption_count]) => ({ id: Number(id), caption_count }))
        .sort((a, b) => b.caption_count - a.caption_count)
        .slice(0, 5)

      setStats({
        totalUsers, totalImages, totalCaptions, totalVotes, superadmins, newUsersThisWeek,
        avgVotesPerCaption: totalCaptions > 0 ? Math.round((totalVotes / totalCaptions) * 10) / 10 : 0,
        avgCaptionsPerImage: totalImages > 0 ? Math.round((totalCaptions / totalImages) * 10) / 10 : 0,
        topVotedCaptions, votingActivityByDay, userGrowth, captionEngagement, imagesWithMostCaptions,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserEmail(user?.email || ''))
    fetchStats()
  }, [supabase, fetchStats])

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar userEmail="" />
        <main className="ml-64 flex-1 flex items-center justify-center">
          <div className="text-gray-400 animate-pulse">Loading dashboard…</div>
        </main>
      </div>
    )
  }

  const s = stats!

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={userEmail} />
      <main className="ml-64 flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Real-time overview of the Humor Study platform</p>
        </div>

        {/* Core Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Users" value={s.totalUsers} sub={`+${s.newUsersThisWeek} this week`} color="violet" />
          <StatCard label="Images Uploaded" value={s.totalImages} sub={`${s.avgCaptionsPerImage} captions avg`} color="blue" />
          <StatCard label="Captions Written" value={s.totalCaptions} sub={`${s.avgVotesPerCaption} votes avg`} color="green" />
          <StatCard label="Total Votes Cast" value={s.totalVotes} sub="all time" color="amber" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Superadmins" value={s.superadmins} color="rose" />
          <StatCard label="Votes / Caption" value={s.avgVotesPerCaption} color="cyan" />
          <StatCard label="Captions / Image" value={s.avgCaptionsPerImage} color="purple" />
          <StatCard label="New Users (7d)" value={s.newUsersThisWeek} color="teal" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-1">Voting Activity by Day</h2>
            <p className="text-gray-500 text-xs mb-5">When users vote most (last 500 votes)</p>
            <DayHeatmap data={s.votingActivityByDay} />
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-1">Caption Engagement Buckets</h2>
            <p className="text-gray-500 text-xs mb-5">How many captions fall into each vote tier</p>
            {s.captionEngagement.map((item, i) => {
              const colors = ['rose', 'amber', 'green', 'violet']
              const max = Math.max(...s.captionEngagement.map(x => x.count), 1)
              return <MiniBar key={item.bucket} label={item.bucket} value={item.count} max={max} color={colors[i]} />
            })}
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-1">Top Voted Captions</h2>
            <p className="text-gray-500 text-xs mb-5">The crowd favorites</p>
            {s.topVotedCaptions.length === 0 ? (
              <p className="text-gray-600 text-sm">No data yet</p>
            ) : s.topVotedCaptions.map((c, i) => {
              const max = s.topVotedCaptions[0]?.votes || 1
              return (
                <div key={c.id} className="mb-4">
                  <div className="flex items-start gap-3">
                    <span className="text-lg font-bold text-violet-400 leading-tight">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 leading-snug mb-1 line-clamp-2">{c.text}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(c.votes / max) * 100}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 font-mono">{c.votes}v</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-1">Most Captioned Images</h2>
            <p className="text-gray-500 text-xs mb-5">Images that sparked the most creativity</p>
            {s.imagesWithMostCaptions.length === 0 ? (
              <p className="text-gray-600 text-sm">No data yet</p>
            ) : s.imagesWithMostCaptions.map((img, i) => {
              const colors = ['violet', 'blue', 'green', 'amber', 'rose']
              const max = s.imagesWithMostCaptions[0]?.caption_count || 1
              return <MiniBar key={img.id} label={`Image #${img.id}`} value={img.caption_count} max={max} color={colors[i % colors.length]} />
            })}

            <div className="mt-6 pt-5 border-t border-gray-800">
              <h3 className="text-white font-semibold text-sm mb-3">User Growth (Last 7 Days)</h3>
              <div className="flex gap-1 items-end" style={{ height: '56px' }}>
                {s.userGrowth.map((g) => {
                  const max = Math.max(...s.userGrowth.map(x => x.count), 1)
                  const h = Math.max(4, (g.count / max) * 48)
                  return (
                    <div key={g.date} className="flex flex-col items-center gap-0.5 flex-1" title={`${g.date}: ${g.count}`}>
                      <div className="w-full bg-cyan-500/70 rounded-t" style={{ height: `${h}px` }} />
                      <span className="text-[8px] text-gray-600">{g.date.split(' ')[1]}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-700 text-xs">
          Humor Study Admin · Data refreshed on load
        </div>
      </main>
    </div>
  )
}
