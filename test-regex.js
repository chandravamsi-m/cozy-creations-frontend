const url = "https://res.cloudinary.com/dzs2bsh1l/image/upload/cozy-creations/products/p2pab7zldc.webp";
console.log(url.replace(/\/(upload|private|authenticated)\/(v[0-9]+\/)?/, '/$1/trans/$2'));
