'use client';

import { useState, useMemo } from 'react';
import { Search, X, AlertTriangle } from 'lucide-react';
import type { EnrichedPlayer } from '@/types/sleeper';
import { getPositionColor, getDraftClassColor } from '@/lib/sleeper';

const POSITIONS = ['All', 'QB', 'RB', 'WR', 'TE'];
const CLASSES = ['All', '2024', '2025', '2026'];

export default function FreeAgentsList({ players }: { players: EnrichedPlayer[] }) {
  const [posFilter, setPosFilter] = useState('All');
  const [classFilter, setClassFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return players.filter((p) => {
      if (posFilter !== 'All' && p.position !== posFilter) return false;
      if (classFilter !== 'All' && p.draftClass !== Number(classFilter)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !p.full_name?.toLowerCase().includes(q) &&
          !p.team?.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [players, posFilter, classFilter, search]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search player or team…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-8 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-green-600 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Position filter */}
        <div className="flex gap-1.5 flex-wrap">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={() => setPosFilter(pos)}
              className={posFilter === pos ? 'pill-btn-active' : 'pill-btn-inactive'}
            >
              {pos}
            </button>
          ))}
        </div>

        {/* Draft class filter */}
        <div className="flex gap-1.5 flex-wrap">
          {CLASSES.map((cls) => (
            <button
              key={cls}
              onClick={() => setClassFilter(cls)}
              className={classFilter === cls ? 'pill-btn-active' : 'pill-btn-inactive'}
            >
              {cls === 'All' ? 'All Classes' : `'${cls.slice(2)}`}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-zinc-600 text-xs font-medium px-1">
        {filtered.length} player{filtered.length !== 1 ? 's' : ''} shown
        {filtered.length !== players.length && ` of ${players.length}`}
      </p>

      {/* Player list */}
      {filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-zinc-500">No players match your filters.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium w-10">#</th>
                  <th className="text-left px-3 py-3 font-medium w-12">Pos</th>
                  <th className="text-left px-3 py-3 font-medium">Player</th>
                  <th className="text-center px-3 py-3 font-medium hidden sm:table-cell">Class</th>
                  <th className="text-center px-3 py-3 font-medium hidden md:table-cell">Age</th>
                  <th className="text-center px-3 py-3 font-medium hidden lg:table-cell">Exp</th>
                  <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">
                    Proj Pts
                  </th>
                  <th className="text-right px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {filtered.map((p, i) => (
                  <PlayerRow key={p.player_id} player={p} rank={i + 1} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerRow({ player: p, rank }: { player: EnrichedPlayer; rank: number }) {
  const injuryColor = p.injury_status
    ? p.injury_status === 'Out' || p.injury_status === 'IR'
      ? 'text-red-400'
      : 'text-yellow-400'
    : 'text-green-400';

  const injuryLabel = p.injury_status ?? 'Active';

  return (
    <tr className="table-row-hover">
      <td className="px-4 py-3 text-zinc-600 font-bold tabular-nums">{rank}</td>
      <td className="px-3 py-3">
        <span className={`pos-badge ${getPositionColor(p.position)}`}>{p.position}</span>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col">
          <span className="text-white font-semibold">{p.full_name}</span>
          <span className="text-zinc-500 text-xs">{p.team ?? 'FA'}</span>
        </div>
      </td>
      <td className="px-3 py-3 text-center hidden sm:table-cell">
        <span className={`class-badge ${getDraftClassColor(p.draftClass)}`}>
          {p.draftClass}
        </span>
      </td>
      <td className="px-3 py-3 text-center text-zinc-400 tabular-nums hidden md:table-cell">
        {p.age ?? '—'}
      </td>
      <td className="px-3 py-3 text-center text-zinc-500 tabular-nums hidden lg:table-cell">
        {p.years_exp === 0 ? 'Rookie' : `Yr ${p.years_exp + 1}`}
      </td>
      <td className="px-4 py-3 text-right hidden sm:table-cell">
        {p.projectedPts != null ? (
          <span className="text-zinc-300 font-mono text-xs bg-zinc-800 px-2 py-0.5 rounded">
            {p.projectedPts.toFixed(1)}
          </span>
        ) : p.search_rank != null ? (
          <span className="text-zinc-500 font-mono text-xs bg-zinc-800/50 px-2 py-0.5 rounded">
            #{p.search_rank}
          </span>
        ) : (
          <span className="text-zinc-600">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <span className={`text-xs font-medium ${injuryColor}`}>
          {p.injury_status ? (
            <span className="flex items-center justify-end gap-1">
              <AlertTriangle size={11} />
              {injuryLabel}
            </span>
          ) : (
            injuryLabel
          )}
        </span>
      </td>
    </tr>
  );
}
