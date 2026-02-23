import 'dotenv/config';
import { runOrchestrator } from './orchestrator';

runOrchestrator().catch((err) => {
  console.error('Fatal error in orchestrator:', err);
  process.exit(1);
});
