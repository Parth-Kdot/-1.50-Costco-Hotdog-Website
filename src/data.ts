export type Role = 'mentor' | 'mentee'

export type Member = {
  id: string
  name: string
  short: string
  handle?: string
  role: Role
  /** Position in the group photo, as a % box of the image (left, top, width, height). */
  spot: { x: number; y: number; w: number; h: number }
  remote?: boolean
}

// Left to right in the photo: Max, Cal, Parth (holding the laptop, Jay on screen), Zeke, Paritosh.
export const members: Member[] = [
  { id: 'zeke', name: 'Esequiel Linares', short: 'Zeke', handle: 'zekepeke', role: 'mentor', spot: { x: 61, y: 23, w: 14, h: 75 } },
  { id: 'jay', name: 'Jay Yu', short: 'Jay', role: 'mentor', remote: true, spot: { x: 45.5, y: 46, w: 10.5, h: 12 } },
  { id: 'max', name: 'Maxwell Meytin', short: 'Max', handle: 'mmeytin', role: 'mentor', spot: { x: 5, y: 18, w: 21, h: 80 } },
  { id: 'cal', name: 'Cal Vest', short: 'Cal', handle: 'cal', role: 'mentee', spot: { x: 25, y: 34, w: 16, h: 64 } },
  { id: 'paritosh', name: 'Paritosh Paudel', short: 'Paritosh', handle: 'paritoshp', role: 'mentee', spot: { x: 74, y: 21, w: 22, h: 77 } },
  { id: 'parth', name: 'Parth Kaushik', short: 'Parth', handle: 'parth', role: 'mentee', spot: { x: 40, y: 20, w: 20, h: 78 } },
]

export type LogEntry = {
  code: string
  title: string
  detail: string
  status: 'done' | 'live' | 'started'
  pts?: number
}

// Static mission log. Add entries here; newest last.
export const missionLog: LogEntry[] = [
  {
    code: 'FAM-01',
    title: 'Family assembled',
    detail: 'Three mentors, three mentees, one name nobody can say with a straight face.',
    status: 'done',
  },
  {
    code: 'FAM-02',
    title: 'Group photo, green wall',
    detail: 'Five in the room, Jay on the laptop. Two sets of bunny ears. Zeke pointing at the screen like it owed him money.',
    status: 'done',
  },
  {
    code: '#7',
    title: 'Moonshot Mission: Family Site',
    detail: 'Build and deploy a page for your family. Members, photos, mission log. You are looking at it.',
    status: 'live',
    pts: 50,
  },
]
