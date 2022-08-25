import winston, { format, transports } from "winston";

export const logger = winston.createLogger({
  transports: [
    new transports.File({
      filename: "logs/error.log",
      level: "error",
      format: format.combine(
        format.json(),
        format.timestamp({
          format: "MMM-DD-YYYY HH:mm:ss",
        }),
        format.printf(
          (info) =>
            `${info.level.toUpperCase()} - ${[info.timestamp]} - ${
              info.message
            }`
        )
      ),
    }),
    new transports.File({
      filename: "logs/info.log",
      level: "info",
      format: format.combine(
        format.json(),
        format.timestamp({
          format: "MMM-DD-YYYY HH:mm:ss",
        }),
        format.printf(
          (info) =>
            `${info.level.toUpperCase()} - ${[info.timestamp]} - ${
              info.message
            }`
        )
      ),
    }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new transports.Console({
      format: format.combine(
        format.json(),
        format.prettyPrint(),
        format.colorize()
      ),
    })
  );
}
