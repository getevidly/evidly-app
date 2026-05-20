/**
 * TeamCard — C13b
 *
 * Single team member card with avatar, completion %, and optional pattern row.
 */

import type { TeamMember } from '../../../hooks/useTeamGrid';

interface TeamCardProps {
  member: TeamMember;
}

export function TeamCard({ member }: TeamCardProps) {
  return (
    <div className="team-card">
      <div className="team-top">
        <div className={`team-avatar ${member.avatar_variant}`}>
          {member.avatar_initials}
        </div>
        <div className="team-info">
          <p className="team-name">{member.full_name}</p>
          <p className="team-role">
            {member.role_label}
            {member.location_name && ` · ${member.location_name}`}
          </p>
        </div>
        <div className="team-stat">
          <div className={`team-pct ${member.avatar_variant}`}>{member.completion_pct}%</div>
          <div className="team-detail">{member.detail_text}</div>
        </div>
      </div>
      {/* TODO: Render team-pattern row when team_patterns table populates */}
    </div>
  );
}
