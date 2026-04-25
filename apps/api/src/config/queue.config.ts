export type QueueConfig = {
  rabbitMqUrl: string;
  taskExecutionQueue: string;
  eventExchange: string;
};

export function getQueueConfig(env: NodeJS.ProcessEnv = process.env): QueueConfig {
  return {
    rabbitMqUrl: env.RABBITMQ_URL ?? 'amqp://localhost:5672',
    taskExecutionQueue: env.TASK_EXECUTION_QUEUE ?? 'task.execution',
    eventExchange: env.EVENT_EXCHANGE ?? 'quant.events',
  };
}

