/**
 * Tisso Shoppable Gallery
 * ------------------------------------------------------------
 * Vanilla JavaScript only.
 * Handles product hotspot modal, color option interaction,
 * dynamic Shopify option mapping, variant selection,
 * auto-add product logic and Shopify AJAX add to cart.
 */

(function () {
  'use strict';

  function initAllTissoGalleries() {
    document.querySelectorAll('[data-tisso-gallery]').forEach(function (section) {
      initTissoGallery(section);
    });
  }

  function initTissoGallery(section) {
    if (!section || section.dataset.initialized === 'true') return;

    section.dataset.initialized = 'true';

    var modal = section.querySelector('[data-product-modal]');
    var hotspots = section.querySelectorAll('[data-hotspot]');
    var closeButtons = section.querySelectorAll('[data-modal-close]');
    var addButton = section.querySelector('[data-add-to-cart]');
    var sizeSelect = section.querySelector('[data-size-select]');
    var colorOptionsWrapper = section.querySelector('[data-color-options]');
    var colorWrapper = section.querySelector('[data-color-wrapper]');
    var sizeWrapper = section.querySelector('[data-size-wrapper]');

    var currentProduct = {
      variants: [],
      options: [],
      selectedOptions: {},
      selectedVariantId: null
    };

    function openModal(hotspot) {
      currentProduct.variants = parseJson(hotspot.dataset.variants, []);
      currentProduct.options = parseJson(hotspot.dataset.options, []);
      currentProduct.selectedOptions = {};
      currentProduct.selectedVariantId = null;

      setModalContent(hotspot);
      renderColorOptions();
      renderSizeOptions();
      updateSelectedVariant();

      modal.hidden = false;
      document.documentElement.classList.add('tisso-modal-open');
    }

    function closeModal() {
      modal.hidden = true;
      document.documentElement.classList.remove('tisso-modal-open');
      setMessage('');
    }

    function parseJson(jsonData, fallback) {
      try {
        return JSON.parse(jsonData || JSON.stringify(fallback));
      } catch (error) {
        console.error('Tisso Gallery: Invalid JSON data.', error);
        return fallback;
      }
    }

    function setModalContent(hotspot) {
      section.querySelector('[data-modal-image]').src = hotspot.dataset.productImage || '';
      section.querySelector('[data-modal-image]').alt = hotspot.dataset.productTitle || '';
      section.querySelector('[data-modal-title]').textContent = hotspot.dataset.productTitle || '';
      section.querySelector('[data-modal-price]').textContent = hotspot.dataset.productPrice || '';
      section.querySelector('[data-modal-description]').textContent = hotspot.dataset.productDescription || '';
    }

    function normalizeValue(value) {
      return String(value || '').trim().toLowerCase();
    }

    function getOptionByName(optionName) {
      return currentProduct.options.find(function (option) {
        return normalizeValue(option.name) === normalizeValue(optionName);
      });
    }

    function getOptionIndex(optionName) {
      var optionIndex = -1;

      currentProduct.options.forEach(function (option, index) {
        if (normalizeValue(option.name) === normalizeValue(optionName)) {
          optionIndex = index;
        }
      });

      return optionIndex;
    }

    function getOptionValues(option) {
      if (!option || !option.values) return [];

      return option.values.map(function (value) {
        if (typeof value === 'string') return value;
        return value.name || value.value || String(value);
      });
    }

    function getColorValue(colorName) {
      var colors = {
        black: '#000000',
        white: '#ffffff',
        blue: '#1f55ff',
        red: '#e0004d',
        grey: '#9b9b9b',
        gray: '#9b9b9b',
        green: '#15803d',
        yellow: '#fff12b',
        orange: '#f97316',
        pink: '#ec4899',
        purple: '#7c3aed',
        brown: '#8b4513',
        beige: '#d6c6a8'
      };

      return colors[normalizeValue(colorName)] || '#1f55ff';
    }

    function renderColorOptions() {
      var colorOption = getOptionByName('Color');
      var colors = getOptionValues(colorOption);

      colorOptionsWrapper.innerHTML = '';

      if (!colorOption || colors.length === 0) {
        colorWrapper.hidden = true;
        return;
      }

      colorWrapper.hidden = false;

      colors.forEach(function (color, index) {
        var button = document.createElement('button');

        button.type = 'button';
        button.className = 'tisso-modal__color';
        button.dataset.color = color;
        button.style.setProperty('--color-swatch', getColorValue(color));
        button.innerHTML = '<span>' + color + '</span>';

        if (index === 0) {
          button.classList.add('is-active');
          currentProduct.selectedOptions[colorOption.name] = color;
        }

        button.addEventListener('mouseenter', function () {
          button.classList.add('is-hovered');
        });

        button.addEventListener('mouseleave', function () {
          button.classList.remove('is-hovered');
        });

        button.addEventListener('click', function () {
          currentProduct.selectedOptions[colorOption.name] = color;

          colorOptionsWrapper.querySelectorAll('.tisso-modal__color').forEach(function (item) {
            item.classList.remove('is-active');
          });

          button.classList.add('is-active');
          updateSelectedVariant();
        });

        colorOptionsWrapper.appendChild(button);
      });
    }

    function renderSizeOptions() {
      var sizeOption = getOptionByName('Size');
      var sizes = getOptionValues(sizeOption);

      sizeSelect.innerHTML = '<option value="">Choose your size</option>';

      if (!sizeOption || sizes.length === 0) {
        sizeWrapper.hidden = true;
        return;
      }

      sizeWrapper.hidden = false;

      sizes.forEach(function (size) {
        var option = document.createElement('option');

        option.value = size;
        option.textContent = size;

        sizeSelect.appendChild(option);
      });

      sizeSelect.onchange = function () {
        currentProduct.selectedOptions[sizeOption.name] = sizeSelect.value;
        updateSelectedVariant();
      };
    }

    function updateSelectedVariant() {
      var matchedVariant = currentProduct.variants.find(function (variant) {
        var allSelectedOptionsMatch = true;

        currentProduct.options.forEach(function (option, index) {
          var selectedValue = currentProduct.selectedOptions[option.name];

          if (!selectedValue) return;

          if (variant['option' + (index + 1)] !== selectedValue) {
            allSelectedOptionsMatch = false;
          }
        });

        return allSelectedOptionsMatch && variant.available;
      });

      currentProduct.selectedVariantId = matchedVariant ? matchedVariant.id : null;
    }

    function shouldAutoAddSoftWinterJacket() {
      var colorOption = getOptionByName('Color');
      var sizeOption = getOptionByName('Size');

      var selectedColor = colorOption ? currentProduct.selectedOptions[colorOption.name] : '';
      var selectedSize = sizeOption ? currentProduct.selectedOptions[sizeOption.name] : '';

      var isBlack = normalizeValue(selectedColor) === 'black';
      var isMedium = normalizeValue(selectedSize) === 'medium' || normalizeValue(selectedSize) === 'm';

      return isBlack && isMedium;
    }

    function addToCart() {
      if (!currentProduct.selectedVariantId) {
        setMessage('Please choose available options.');
        return;
      }

      var autoAddInput = section.querySelector('[data-auto-add-variant-id]');
      var autoAddVariantId = autoAddInput ? autoAddInput.value : '';
      var shouldAutoAddProduct = shouldAutoAddSoftWinterJacket() && autoAddVariantId !== '';

      var items = [
        {
          id: Number(currentProduct.selectedVariantId),
          quantity: 1
        }
      ];

      if (shouldAutoAddProduct) {
        items.push({
          id: Number(autoAddVariantId),
          quantity: 1
        });
      }

      addButton.disabled = true;
      setMessage('Adding...');

      fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          items: items
        })
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error('Unable to add product.');
          }

          return response.json();
        })
        .then(function () {
          setMessage(
            shouldAutoAddProduct
              ? 'Added to cart with Soft Winter Jacket.'
              : 'Added to cart successfully.'
          );

          window.location.href = '/cart';
        })
        .catch(function (error) {
          console.error('Tisso Gallery:', error);
          setMessage('Something went wrong. Please try again.');
        })
        .finally(function () {
          addButton.disabled = false;
        });
    }

    function setMessage(message) {
      section.querySelector('[data-modal-message]').textContent = message;
    }

    hotspots.forEach(function (hotspot) {
      hotspot.addEventListener('click', function () {
        openModal(hotspot);
      });
    });

    closeButtons.forEach(function (button) {
      button.addEventListener('click', closeModal);
    });

    addButton.addEventListener('click', addToCart);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !modal.hidden) {
        closeModal();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initAllTissoGalleries);

  document.addEventListener('shopify:section:load', function (event) {
    initTissoGallery(event.target);
  });
})();