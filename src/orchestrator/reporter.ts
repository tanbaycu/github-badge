import pc from 'picocolors';
import { ReconProfileReport } from '../types';

export class Reporter {
  public static printBanner(targetUser: string, operatorId = 'VOD-HAC-9X0F2E'): void {
    const art = `
${pc.cyan('  ____ ___ _____ _____ ____   ___  ____  _   ___   __ ')}
${pc.cyan(' / ___|_ _|_   _|_   _|  _ \\ / _ \\|  _ \\| | | \\ \\ / / ')}
${pc.cyan('| |  _ | |  | |   | | | |_) | | | | |_) | |_| |\\ V /  ')}
${pc.cyan('| |_| || |  | |   | | |  _ <| |_| |  __/|  _  | | |   ')}
${pc.cyan(' \\____|___| |_|   |_| |_| \\_\\\\___/|_|   |_| |_| |_|   ')}
`;
    console.log(art);
    console.log(
      pc.green(`[HAWL BLACK HAT ENGINE] :: AUTONOMOUS GITHUB TROPHY & BADGE HUNTER v1.0.0`)
    );
    console.log(
      pc.green(`OPERATOR: ${operatorId} | STATUS: ARMED & OPERATIONAL`)
    );
    console.log(
      pc.yellow(`TARGET PROFILE: @${targetUser}\n`)
    );
  }

  public static printReconReport(report: ReconProfileReport): void {
    console.log(pc.cyan(`+-- RECONNAISSANCE REPORT [@${report.username}]`));

    for (const item of report.achievements) {
      const namePadded = item.name.padEnd(20, ' ');
      const tierPadded = item.tier.padEnd(12, ' ');
      const statusStyled =
        item.status === 'ACQUIRED'
          ? pc.green('[ ACQUIRED ]')
          : pc.yellow('[ HUNTABLE ]');

      console.log(
        pc.white(`| `) +
        pc.bold(namePadded) +
        pc.dim(tierPadded) +
        statusStyled +
        pc.dim(` - ${item.description}`)
      );
    }
    console.log('');
  }

  public static printHarvestHeader(sharkQuota: number, pairQuota: number, galaxyQuota: number): void {
    console.log(pc.green(`[+] INITIATING AUTONOMOUS TROPHY HARVEST SEQUENCE`));
    console.log(
      pc.cyan(
        `[INFO] Target quotas armed: Shark [${sharkQuota} PRs] | Pair [${pairQuota} PRs] | Galaxy [${galaxyQuota} answers]\n`
      )
    );
  }

  public static formatLog(timestamp: string, level: string, message: string): void {
    let levelStyled = level;
    switch (level) {
      case 'PAYLOAD':
        levelStyled = pc.magenta('[PAYLOAD]');
        break;
      case 'INFO':
        levelStyled = pc.cyan('[INFO]');
        break;
      case 'OK':
        levelStyled = pc.green('[OK]');
        break;
      case 'WARN':
        levelStyled = pc.yellow('[WARN]');
        break;
      case 'ERROR':
        levelStyled = pc.red('[ERROR]');
        break;
      default:
        levelStyled = `[${level}]`;
    }

    console.log(`${pc.dim(`[${timestamp}]`)} ${levelStyled} ${message}`);
  }
}
