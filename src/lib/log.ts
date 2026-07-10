const write = (stream: NodeJS.WriteStream, level: string, msg: string): void => {
  stream.write(`[${level}] ${msg}\n`);
};

export const log = {
  info: (msg: string): void => write(process.stdout, 'info', msg),
  warn: (msg: string): void => write(process.stderr, 'warn', msg),
  error: (msg: string): void => write(process.stderr, 'error', msg),
};
