import './styles/styles.css';
import { DatabaseService } from './services/Database';
import { UserController } from './controllers/UserController';

async function bootstrap() {
  const msg = document.getElementById('message');
  try {
    await DatabaseService.init();
    new UserController();
  } catch (error) {
    console.error('Error durante la inicialización:', error);
    if (msg) {
      msg.textContent = `Error al iniciar: ${(error as Error).message}`;
      msg.className = 'message error';
    }
  }
}

bootstrap();