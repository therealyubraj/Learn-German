declare module "qrcode" {
  type QrRenderOptions = {
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
    width?: number;
  };

  const QRCode: {
    toDataURL(input: string, options?: QrRenderOptions): Promise<string>;
  };

  export default QRCode;
}
