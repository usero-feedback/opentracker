export const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
	// Atlantic Division
	BOS: { primary: '#007A33', secondary: '#BA9653' }, // Celtics - Historic green
	BRK: { primary: '#ffffff', secondary: '#000000' }, // Nets - Black with dark gray
	NYK: { primary: '#006BB6', secondary: '#F58426' }, // Knicks - Traditional blue
	PHI: { primary: '#0C479D', secondary: '#ED174C' }, // 76ers - Darker blue to differentiate
	TOR: { primary: '#CE1141', secondary: '#A1A1A4' }, // Raptors - Red with silver

	// Central Division
	CHI: { primary: '#CE1141', secondary: '#000000' }, // Bulls - Historic red
	CLE: { primary: '#860038', secondary: '#041E42' }, // Cavaliers - Wine
	DET: { primary: '#1D42BA', secondary: '#C8102E' }, // Pistons - Blue primary now
	IND: { primary: '#002D62', secondary: '#FDBB30' }, // Pacers - Navy
	MIL: { primary: '#00471B', secondary: '#EEE1C6' }, // Bucks - Green

	// Southeast Division
	ATL: { primary: '#E03A3E', secondary: '#C1D32F' }, // Hawks - Red
	CHO: { primary: '#00788C', secondary: '#1D1160' }, // Hornets - Teal primary now
	MIA: { primary: '#98002E', secondary: '#F9A01B' }, // Heat - Dark red
	ORL: { primary: '#0077C0', secondary: '#C4CED4' }, // Magic - Blue
	WAS: { primary: '#E31837', secondary: '#002B5C' }, // Wizards - Red primary now

	// Northwest Division
	DEN: { primary: '#0E2240', secondary: '#FEC524' }, // Nuggets - Navy
	MIN: { primary: '#236192', secondary: '#0C2340' }, // Wolves - Lighter blue primary
	OKC: { primary: '#007AC1', secondary: '#EF3B24' }, // Thunder - Blue
	POR: { primary: '#DA2127', secondary: '#000000' }, // Blazers - Slightly different red
	UTA: { primary: '#00471B', secondary: '#002B5C' }, // Jazz - Green primary now

	// Pacific Division
	GSW: { primary: '#1D428A', secondary: '#FFC72C' }, // Warriors - Blue
	LAC: { primary: '#1D428A', secondary: '#C8102E' }, // Clippers - Blue primary now
	LAL: { primary: '#552583', secondary: '#FDB927' }, // Lakers - Purple
	PHO: { primary: '#E56020', secondary: '#1D1160' }, // Suns - Orange primary now
	SAC: { primary: '#5A2D81', secondary: '#63727A' }, // Kings - Purple

	// Southwest Division
	DAL: { primary: '#00538C', secondary: '#002B5E' }, // Mavericks - Blue
	HOU: { primary: '#C4173F', secondary: '#000000' }, // Rockets - Darker red
	MEM: { primary: '#5D76A9', secondary: '#12173F' }, // Grizzlies - Light blue
	NOP: { primary: '#B4975A', secondary: '#0C2340' }, // Pelicans - Gold primary now
	SAS: { primary: '#c4ced4', secondary: '#000000' }, // Spurs - Black primary now
}

export function getTeamColor(teamCode: string) {
	return TEAM_COLORS[teamCode]?.primary
}
