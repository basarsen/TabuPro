export type TeamColor = 'Kırmızı' | 'Mavi'

export type TeamPlayer = {
    id: string
    username: string | null
}

export type Team = {
    color: TeamColor
    players: TeamPlayer[]
    score?: number
}
