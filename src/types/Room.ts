import type { Team } from './Team'

export type Room = {
    id: string
    code: string
    owner_id: string
    stream_url: string | null
    round_second: number
    pass_limit: number
    active_team: 'Kırmızı' | 'Mavi' | null
    explainer_id: string | null
    controller_id: string | null
    current_card_id: string | null
    used_card_ids: string[]
    passes_used: number
    teams: Team[]
    starts_at: string | null
    ends_at: string | null
    category_id: string
    created_at: string
    updated_at: string
}
