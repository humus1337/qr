<?php
/**
 * Plugin Name:       DesignYourQR - QR Code Generator
 * Plugin URI:        https://designyourqr.com
 * Description:        Add designed, scannable QR codes to any post or page with the [designyourqr] shortcode or the block editor. Static codes that never expire, 9 style presets, gradients, custom shapes and logo embedding. Powered by designyourqr.com.
 * Version:           1.1.0
 * Requires at least: 5.0
 * Requires PHP:      7.0
 * Author:            DesignYourQR
 * Author URI:        https://designyourqr.com
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       designyourqr
 *
 * The QR codes are rendered in the browser by the same engine that powers
 * designyourqr.com (assets/qr-encoder.js + assets/renderer.js). Nothing is
 * sent to an external server: the shortcode (or block) prints a container,
 * and the bundled script draws the SVG into it on page load.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'DESIGNYOURQR_VERSION', '1.1.0' );
define( 'DESIGNYOURQR_URL', plugin_dir_url( __FILE__ ) );

/**
 * Register front-end assets. They are only enqueued on pages that actually
 * use the shortcode or block (see designyourqr_render).
 */
function designyourqr_register_assets() {
	wp_register_script(
		'designyourqr-encoder',
		DESIGNYOURQR_URL . 'assets/qr-encoder.js',
		array(),
		DESIGNYOURQR_VERSION,
		true
	);
	wp_register_script(
		'designyourqr-renderer',
		DESIGNYOURQR_URL . 'assets/renderer.js',
		array( 'designyourqr-encoder' ),
		DESIGNYOURQR_VERSION,
		true
	);
	wp_register_script(
		'designyourqr',
		DESIGNYOURQR_URL . 'assets/dyqr.js',
		array( 'designyourqr-renderer' ),
		DESIGNYOURQR_VERSION,
		true
	);
}
add_action( 'wp_enqueue_scripts', 'designyourqr_register_assets' );

/**
 * The default attribute set, shared by the shortcode and the block. Keeping
 * one list means both entry points accept the same options.
 */
function designyourqr_defaults() {
	return array(
		'content'     => '',
		'type'        => 'url',
		'preset'      => '',
		'size'        => '300',
		'dot'         => '',
		'eyeframe'    => '',
		'eyepupil'    => '',
		'c1'          => '',
		'c2'          => '',
		'angle'       => '',
		'bg'          => '',
		'transparent' => '',
		'ec'          => '',
		'margin'      => '',
		'caption'     => '1',
		'align'       => 'center',
		// type-specific
		'ssid'        => '',
		'pass'        => '',
		'enc'         => '',
		'hidden'      => '',
		'to'          => '',
		'subject'     => '',
		'body'        => '',
		'msg'         => '',
		'first'       => '',
		'last'        => '',
		'org'         => '',
		'title'       => '',
		'phone'       => '',
		'email'       => '',
		'url'         => '',
	);
}

/**
 * Turn a normalized attribute array into the container HTML. Both the
 * shortcode and the block render_callback funnel through here.
 */
function designyourqr_render( $a ) {
	wp_enqueue_script( 'designyourqr' );

	$types = array( 'url', 'text', 'wifi', 'email', 'phone', 'sms', 'vcard' );
	$type  = in_array( $a['type'], $types, true ) ? $a['type'] : 'url';

	// Build the options object the browser script expects.
	$opts = array( 'type' => $type );

	if ( '' !== $a['preset'] )   { $opts['preset'] = $a['preset']; }
	if ( '' !== $a['dot'] )      { $opts['dot'] = $a['dot']; }
	if ( '' !== $a['eyeframe'] ) { $opts['eyeFrame'] = $a['eyeframe']; }
	if ( '' !== $a['eyepupil'] ) { $opts['eyePupil'] = $a['eyepupil']; }
	if ( '' !== $a['ec'] )       { $opts['ec'] = $a['ec']; }
	if ( '' !== $a['margin'] )   { $opts['margin'] = (int) $a['margin']; }

	$color = array();
	if ( '' !== $a['c1'] )    { $color['c1'] = $a['c1']; }
	if ( '' !== $a['c2'] )    { $color['c2'] = $a['c2']; }
	if ( '' !== $a['angle'] ) { $color['angle'] = (int) $a['angle']; }
	if ( $color )             { $opts['color'] = $color; }

	$bg = array();
	if ( '' !== $a['bg'] )          { $bg['color'] = $a['bg']; }
	if ( '' !== $a['transparent'] ) { $bg['transparent'] = ( '1' === $a['transparent'] || 'true' === $a['transparent'] ); }
	if ( $bg )                      { $opts['background'] = $bg; }

	// The primary content value, plus any structured fields.
	$content = $a['content'];
	if ( 'wifi' === $type ) {
		$content = array(
			'type'   => 'wifi',
			'ssid'   => $a['ssid'],
			'pass'   => $a['pass'],
			'enc'    => '' !== $a['enc'] ? $a['enc'] : 'WPA',
			'hidden' => ( '1' === $a['hidden'] || 'true' === $a['hidden'] ),
		);
	} elseif ( 'email' === $type ) {
		$content = array(
			'type'    => 'email',
			'to'      => '' !== $a['to'] ? $a['to'] : $a['content'],
			'subject' => $a['subject'],
			'body'    => $a['body'],
		);
	} elseif ( 'sms' === $type ) {
		$content = array(
			'type' => 'sms',
			'to'   => '' !== $a['to'] ? $a['to'] : $a['content'],
			'msg'  => $a['msg'],
		);
	} elseif ( 'vcard' === $type ) {
		$content = array(
			'type'  => 'vcard',
			'first' => $a['first'],
			'last'  => $a['last'],
			'org'   => $a['org'],
			'title' => $a['title'],
			'phone' => $a['phone'],
			'email' => $a['email'],
			'url'   => $a['url'],
		);
	}

	$payload = array(
		'content' => $content,
		'opts'    => $opts,
		'size'    => (int) $a['size'],
		'caption' => ( '0' !== (string) $a['caption'] && 'false' !== $a['caption'] && false !== $a['caption'] ),
	);

	$align = in_array( $a['align'], array( 'left', 'center', 'right' ), true ) ? $a['align'] : 'center';

	$json = wp_json_encode( $payload );

	$html  = '<div class="dyqr-block" style="text-align:' . esc_attr( $align ) . '">';
	$html .= '<div class="dyqr" data-dyqr="' . esc_attr( $json ) . '" style="display:inline-block;max-width:100%;line-height:0"></div>';
	$html .= '</div>';

	return $html;
}

/**
 * [designyourqr content="https://example.com" preset="ocean" size="300"]
 *
 * Common attributes:
 *   content   the link, or the text when type="text", or the number when type="phone"
 *   type      url (default) | text | wifi | email | phone | sms | vcard
 *   preset    classic | ink | ocean | sunset | forest | grape | midnight | blush | stripe
 *   size      output width in px (default 300); the SVG scales to its container
 *   dot       square | rounded | dots | fluid | diamond | leaf | bars
 *   eyeframe  square | rounded | extra | circle | leaf
 *   eyepupil  square | rounded | dot | leaf | diamond
 *   c1,c2     start/end colors; angle for a linear gradient
 *   bg        background color (default #ffffff); transparent="1" for none
 *   ec        error correction L | M | Q | H
 *   margin    quiet zone in modules (default 4)
 *   caption   "1" (default) shows a small "Made with DesignYourQR" credit, "0" hides it
 *   align     left | center (default) | right
 *   wifi:  ssid, pass, enc (WPA|WEP|nopass), hidden
 *   email: to, subject, body
 *   sms:   to, msg
 *   vcard: first, last, org, title, phone, email, url
 */
function designyourqr_shortcode( $atts ) {
	$a = shortcode_atts( designyourqr_defaults(), $atts, 'designyourqr' );
	return designyourqr_render( $a );
}
add_shortcode( 'designyourqr', 'designyourqr_shortcode' );

/**
 * Block editor: a dynamic block that reuses designyourqr_render on the front
 * end, so the output matches the shortcode exactly. The editor shows a labeled
 * placeholder with controls; the real QR draws on the published page.
 */
function designyourqr_render_block( $attributes ) {
	$a = wp_parse_args( $attributes, designyourqr_defaults() );
	return designyourqr_render( $a );
}

function designyourqr_register_block() {
	if ( ! function_exists( 'register_block_type' ) ) {
		return; // WordPress older than 5.0
	}

	wp_register_script(
		'designyourqr-block',
		DESIGNYOURQR_URL . 'assets/block.js',
		array( 'wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-i18n' ),
		DESIGNYOURQR_VERSION,
		true
	);

	// Every shortcode attribute is a string block attribute, so the block and
	// the shortcode accept the same option set.
	$attributes = array();
	foreach ( designyourqr_defaults() as $key => $default ) {
		$attributes[ $key ] = array(
			'type'    => 'string',
			'default' => (string) $default,
		);
	}

	register_block_type(
		'designyourqr/qr',
		array(
			'editor_script'   => 'designyourqr-block',
			'render_callback' => 'designyourqr_render_block',
			'attributes'      => $attributes,
		)
	);
}
add_action( 'init', 'designyourqr_register_block' );
