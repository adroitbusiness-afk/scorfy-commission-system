declare module 'docxtemplater-image-module' {
  import { Docxtemplater } from 'docxtemplater';

  interface ImageModuleOptions {
    centered?: boolean;
    getImage?: (tagValue: string, tagName: string) => Promise<Buffer> | Buffer;
    getSize?: (img: any, tagValue: string, tagName: string) => Promise<[number, number]> | [number, number];
  }

  class ImageModule {
    constructor(options: ImageModuleOptions);
    attach(doc: Docxtemplater): void;
  }

  export = ImageModule;
}